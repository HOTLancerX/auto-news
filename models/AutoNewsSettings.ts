import mongoose, { Schema, type Document } from "mongoose";

export interface IAutoNewsSettings extends Document {
    apiUrl: string;
    apiKey: string;
    aiModel: string;
    language: string;
    postsPerRun: number;
    createdAt: Date;
    updatedAt: Date;
}

const AutoNewsSettingsSchema = new Schema<IAutoNewsSettings>(
    {
        apiUrl:      { type: String, default: "" },
        apiKey:      { type: String, default: "" },
        aiModel:     { type: String, default: "gpt-3.5-turbo" },
        language:    { type: String, default: "en" },
        postsPerRun: { type: Number, default: 1 },
    },
    { timestamps: true }
);

export default (mongoose.models.AutoNewsSettings as mongoose.Model<IAutoNewsSettings>) ||
    mongoose.model<IAutoNewsSettings>("AutoNewsSettings", AutoNewsSettingsSchema);
