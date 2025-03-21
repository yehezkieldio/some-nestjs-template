/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
    Injectable,
    NestMiddleware,
    ExecutionContext,
    CallHandler,
    Inject,
    Module,
    DynamicModule,
    Global,
    NestInterceptor
} from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import {
    trace,
    context as otelContext,
    SpanStatusCode,
    type ContextManager,
    type Context,
    type SpanOptions,
    type Span,
    type Attributes,
    TraceAPI,
    ProxyTracer,
    Exception
} from "@opentelemetry/api";
import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { Request, Response, NextFunction } from "express";
import { Observable } from "rxjs";
import { tap, catchError } from "rxjs/operators";

const parseNumericString = (message: string): number | null => {
    if (message.length < 16) {
        if (message.length === 0) return null;

        const length = Number(message);
        if (Number.isNaN(length)) return null;

        return length;
    }

    // if 16 digit but less then 9,007,199,254,740,991 then can be parsed
    if (message.length === 16) {
        const number = Number(message);

        if (number.toString() !== message || message.trim().length === 0 || Number.isNaN(number)) return null;

        return number;
    }

    return null;
};

type OpenTelemetryOptions = NonNullable<ConstructorParameters<typeof NodeSDK>[0]>;

export interface NestOpenTelemetryOptions extends OpenTelemetryOptions {
    contextManager?: ContextManager;
}

export type ActiveSpanArgs<F extends (span: Span) => unknown = (span: Span) => unknown> =
    | [name: string, fn: F]
    | [name: string, options: SpanOptions, fn: F]
    | [name: string, options: SpanOptions, context: Context, fn: F];

const createActiveSpanHandler = (fn: (span: Span) => unknown) =>
    function (span: Span) {
        try {
            const result = fn(span);

            /* eslint-disable @typescript-eslint/no-unsafe-return */
            /* eslint-disable @typescript-eslint/no-unsafe-call */
            if (result instanceof Promise || typeof result?.["then"] === "function")
                return result["then"]((result: any) => {
                    if (span.isRecording()) span.end();

                    return result;
                });

            if (span.isRecording()) span.end();

            return result;
        } catch (error) {
            if (!span.isRecording()) throw error;

            const err = error as Error;

            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: err?.message
            });

            span.recordException(err);
            span.end();

            throw error;
        }
    };

export const createContext = (parent: Span) => ({
    getValue() {
        return parent;
    },
    setValue() {
        return otelContext.active();
    },
    deleteValue() {
        return otelContext.active();
    }
});

export type Tracer = ReturnType<TraceAPI["getTracer"]>;
export type StartSpan = Tracer["startSpan"];
export type StartActiveSpan = Tracer["startActiveSpan"];

export const contextKeySpan = Symbol.for("OpenTelemetry Context Key SPAN");

export const getTracer = (serviceName = "NestJS"): ReturnType<TraceAPI["getTracer"]> => {
    const tracer = trace.getTracer(serviceName);

    return {
        ...tracer,
        startSpan(name: string, options?: SpanOptions, context?: Context) {
            return tracer.startSpan(name, options, context);
        },
        startActiveSpan(...args: ActiveSpanArgs) {
            switch (args.length) {
                case 2:
                    return tracer.startActiveSpan(args[0], createActiveSpanHandler(args[1]));

                case 3:
                    return tracer.startActiveSpan(args[0], args[1], createActiveSpanHandler(args[2]));

                case 4:
                    return tracer.startActiveSpan(args[0], args[1], args[2], createActiveSpanHandler(args[3]));
            }
        }
    };
};

export const startActiveSpan: StartActiveSpan = (...args: ActiveSpanArgs) => {
    const tracer = getTracer();

    switch (args.length) {
        case 2:
            return tracer.startActiveSpan(args[0], createActiveSpanHandler(args[1]));

        case 3:
            return tracer.startActiveSpan(args[0], args[1], createActiveSpanHandler(args[2]));

        case 4:
            return tracer.startActiveSpan(args[0], args[1], args[2], createActiveSpanHandler(args[3]));
    }
};

export const record = startActiveSpan;

export const getCurrentSpan = (): Span | undefined => {
    const context = otelContext.active();
    return trace.getSpan(context);
};

/**
 * Set attributes to the current span
 *
 * @returns boolean - whether the attributes are set or not
 */
export const setAttributes = (attributes: Attributes): boolean => {
    const span = getCurrentSpan();
    if (span) {
        span.setAttributes(attributes);
        return true;
    }
    return false;
};

@Injectable()
export class OpenTelemetryInterceptor implements NestInterceptor {
    constructor(@Inject("TRACER") private readonly tracer: ReturnType<TraceAPI["getTracer"]>) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const httpContext = context.switchToHttp();
        const request = httpContext.getRequest<Request>();
        const response = httpContext.getResponse<Response>();
        const { method, url, headers, body } = request;
        const requestId = Math.random().toString(36).substring(2, 15);

        return this.tracer.startActiveSpan("http_request", (span) => {
            // Set initial span attributes
            span.setAttributes({
                "http.request.id": requestId,
                "http.request.method": method,
                "url.path": request.path,
                "url.full": url
            });

            if (request.query && Object.keys(request.query).length > 0) {
                span.setAttribute("url.query", JSON.stringify(request.query));
            }

            // Extract and set headers as attributes
            for (const [key, value] of Object.entries(headers)) {
                const headerKey = key.toLowerCase();
                if (headerKey === "user-agent") {
                    span.setAttribute("user_agent.original", value as string);
                } else {
                    span.setAttribute(
                        `http.request.header.${headerKey}`,
                        typeof value === "object" ? JSON.stringify(value) : (value as string)
                    );
                }
            }

            // Extract content length if available
            const contentLength = request.headers["content-length"];
            if (contentLength) {
                const parsedLength = parseNumericString(contentLength);
                if (parsedLength !== null) {
                    span.setAttribute("http.request_content_length", parsedLength);
                }
            }

            // Set body attributes if available
            if (body) {
                const bodyStr = typeof body === "object" ? JSON.stringify(body) : String(body);
                span.setAttribute("http.request.body", bodyStr);
                span.setAttribute("http.request.body.size", bodyStr.length);
            }

            // Set client IP if available
            if (request.ip) {
                span.setAttribute("client.address", request.ip);
            }

            // Set context-specific attributes
            if (request.params && Object.keys(request.params).length > 0) {
                span.setAttribute("http.route.params", JSON.stringify(request.params));
            }

            // Set cookies if available
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            if (request.cookies && Object.keys(request.cookies).length > 0) {
                span.setAttribute("http.request.cookie", JSON.stringify(request.cookies));
            }

            const contextWithSpan = trace.setSpan(otelContext.active(), span);

            return otelContext.with(contextWithSpan, () => {
                return next.handle().pipe(
                    tap((data) => {
                        // Set response attributes
                        span.setAttribute("http.response.status_code", response.statusCode);

                        // Set response headers
                        for (const [key, value] of Object.entries(response.getHeaders())) {
                            const headerKey = key.toLowerCase();
                            span.setAttribute(
                                `http.response.header.${headerKey}`,
                                typeof value === "object" ? JSON.stringify(value) : (value as string)
                            );
                        }

                        // Set response body size if available
                        if (data) {
                            const responseStr = typeof data === "object" ? JSON.stringify(data) : String(data);
                            span.setAttribute("http.response.body.size", responseStr.length);
                        }

                        span.setStatus({ code: SpanStatusCode.OK });
                    }),
                    catchError((error) => {
                        span.setStatus({
                            code: SpanStatusCode.ERROR,
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                            message: error.message
                        });
                        span.recordException(error as Exception);
                        throw error;
                    })
                );
            });
        });
    }
}

@Injectable()
export class OpenTelemetryMiddleware implements NestMiddleware {
    constructor(@Inject("TRACER") private readonly tracer: ReturnType<TraceAPI["getTracer"]>) {}

    use(req: Request, res: Response, next: NextFunction) {
        // Extract context from headers
        // const parentContext = propagation.extract(ROOT_CONTEXT, req.headers);

        // Ensure request has an ID
        // req.id = req.id || Math.random().toString(36).substring(2, 15);

        // Continue with the middleware chain
        next();
    }
}

@Global()
@Module({})
export class OpenTelemetryModule {
    static forRoot(options: NestOpenTelemetryOptions = {}): DynamicModule {
        let tracer: ReturnType<TraceAPI["getTracer"]>;
        const serviceName = options.serviceName || "NestJS";
        diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

        return {
            module: OpenTelemetryModule,
            providers: [
                {
                    provide: "TRACER",
                    useFactory: () => {
                        tracer = trace.getTracer(serviceName);

                        // Initialize OpenTelemetry SDK if not already initialized
                        if (tracer instanceof ProxyTracer) {
                            const sdk = new NodeSDK({
                                ...options,
                                serviceName
                            });

                            sdk.start();
                            tracer = trace.getTracer(serviceName);
                        }

                        // Setup context manager if provided
                        if (options.contextManager) {
                            try {
                                options.contextManager.enable();
                                otelContext.setGlobalContextManager(options.contextManager);
                            } catch (error) {
                                console.warn("Failed to set context manager:", error);
                            }
                        }

                        return tracer;
                    }
                },
                {
                    provide: APP_INTERCEPTOR,
                    useClass: OpenTelemetryInterceptor
                },
                OpenTelemetryInterceptor,
                OpenTelemetryMiddleware
            ],
            exports: ["TRACER", OpenTelemetryInterceptor, OpenTelemetryMiddleware]
        };
    }
}
