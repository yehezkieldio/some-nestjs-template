import { Controller, Get } from "@nestjs/common";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const HealthCheckSchema = z.object({
    status: z.literal("ok")
});

class HealthCheckDTO extends createZodDto(HealthCheckSchema) {}

@Controller()
export class AppController {
    @Get("/health")
    getHealthCheck(): HealthCheckDTO {
        return {
            status: "ok"
        };
    }
}
