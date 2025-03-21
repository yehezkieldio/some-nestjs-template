import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

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
            isGlobal: true,
        }),
    ],
    controllers: [AppController],
    providers: [],
})
export class AppModule {}
