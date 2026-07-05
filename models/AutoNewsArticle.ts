import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IAutoNewsArticle extends Document {
    feedId: Types.ObjectId;
    articleUrl: string;
    title: string;
    posted: boolean;
    postId: Types.ObjectId | null;
    createdAt: Date;
    updatedAt: Date;
}

const AutoNewsArticleSchema = new Schema<IAutoNewsArticle>(
    {
        feedId:     { type: Schema.Types.ObjectId, ref: "AutoNewsFeed", required: true, index: true },
        articleUrl: { type: String, required: true },
        title:      { type: String, default: "" },
        posted:     { type: Boolean, default: false },
        postId:     { type: Schema.Types.ObjectId, ref: "Post", default: null },
    },
    { timestamps: true }
);

AutoNewsArticleSchema.index({ articleUrl: 1 }, { unique: true });

export default (mongoose.models.AutoNewsArticle as mongoose.Model<IAutoNewsArticle>) ||
    mongoose.model<IAutoNewsArticle>("AutoNewsArticle", AutoNewsArticleSchema);
