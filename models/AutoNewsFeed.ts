import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IAutoNewsFeed extends Document {
    title: string;
    feedUrl: string;
    category: Types.ObjectId | null;
    userId: string;
    language: string;
    postMode: "direct" | "ai";
    imageType: "cdn" | "cloudinary" | "cloudflare";
    defaultImage: string;
    active: boolean;
    lastFetched: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const AutoNewsFeedSchema = new Schema<IAutoNewsFeed>(
    {
        title:     { type: String, required: true },
        feedUrl:   { type: String, required: true },
        category:  { type: Schema.Types.ObjectId, ref: "Cat", default: null },
        userId:    { type: String, default: "" },
        language:  { type: String, default: "en" },
        postMode:  { type: String, enum: ["direct", "ai"], default: "direct" },
        imageType: { type: String, enum: ["cdn", "cloudinary", "cloudflare"], default: "cdn" },
        defaultImage: { type: String, default: "" },
        active:    { type: Boolean, default: true },
        lastFetched: { type: Date, default: null },
    },
    { timestamps: true }
);

export default (mongoose.models.AutoNewsFeed as mongoose.Model<IAutoNewsFeed>) ||
    mongoose.model<IAutoNewsFeed>("AutoNewsFeed", AutoNewsFeedSchema);
