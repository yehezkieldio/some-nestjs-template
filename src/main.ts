import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { apiReference } from "@scalar/nestjs-api-reference";
import { patchNestJsSwagger } from "nestjs-zod";

import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
    const app = await NestFactory.create(AppModule, {
        bufferLogs: true
    });

    patchNestJsSwagger();

    const config = new DocumentBuilder()
        .setTitle("Some Nest.js Template")
        .setDescription("Hello, world!")
        .setVersion("0.0.0")
        .build();

    const document = SwaggerModule.createDocument(app, config);

    app.use(
        "/reference",
        apiReference({
            content: document,
            hideClientButton: false,
            showSidebar: true,
            theme: "default",
            layout: "modern",
            isEditable: false,
            isLoading: false,
            hideModels: false,
            hideDownloadButton: false,
            hideTestRequestButton: false,
            hideDarkModeToggle: false,
            hideSearch: false,
            withDefaultFonts: true
        })
    );

    const port: number = Number(process.env.API_PORT) || 3000;
    const hostname: string = process.env.API_HOSTNAME ?? "0.0.0.0";

    await app.listen(port, hostname);
}

void bootstrap();
