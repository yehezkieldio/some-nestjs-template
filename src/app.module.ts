import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { BatchSpanProcessor, ConsoleSpanExporter } from "@opentelemetry/sdk-trace-node";
import { OpenTelemetryModule } from "#/opentelemetry/opentelemetry.module";

import { envSchema } from "./app.config";
import { AppController } from "./app.controller";

@Module({
    imports: [
        ConfigModule.forRoot({
            validate: (config) => {
                const result = envSchema.safeParse(config);
                if (!result.success) {
                    console.error("❌ Invalid environment variables:", result.error.format());
                    throw new Error("Invalid environment variables");
                }
                return result.data;
            },
            isGlobal: true
        }),
        OpenTelemetryModule.forRoot({
            serviceName: "somenestjs",
            spanProcessors: [
                new BatchSpanProcessor(
                    new OTLPTraceExporter({
                        url: "http://localhost:4317",
                        timeoutMillis: 10000
                    })
                ),
                new BatchSpanProcessor(new ConsoleSpanExporter())
            ]
        })
    ],
    controllers: [AppController],
    providers: []
})
export class AppModule {}
