import { Controller, Get } from "@nestjs/common";
import { startActiveSpan } from "#/opentelemetry/opentelemetry.module";

@Controller()
export class AppController {
    @Get("/health")
    getHealthCheck() {
        return startActiveSpan("health", () => {
            return {
                status: "ok"
            };
        });
    }
}
