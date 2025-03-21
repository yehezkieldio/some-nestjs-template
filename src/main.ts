import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
// import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
// import { apiReference } from "@scalar/nestjs-api-reference";
// import { patchNestJsSwagger } from "nestjs-zod";

import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
        bufferLogs: true
    });

    // registerApiReference(app);

    const port: number = Number(process.env.API_PORT) || 3000;
    const hostname: string = process.env.API_HOSTNAME ?? "0.0.0.0";

    await app.listen(port, hostname);
}

// function registerApiReference(app: NestExpressApplication): void {
//     patchNestJsSwagger();

//     const config = new DocumentBuilder().setTitle("Hello, world!").setDescription("WIP").setVersion("0.0.0").build();
//     const document = SwaggerModule.createDocument(app, config);
// }

void bootstrap();
