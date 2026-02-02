import { Upload } from "@aws-sdk/lib-storage";
import {
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import s3 from "../config/aws.js";
import File from "../models/File.js";

/**
 * ===============================
 * UPLOAD FILE
 * ===============================
 */
export const uploadFile = async (req, res) => {
  try {
    console.log("=== UPLOAD HIT ===");
    console.log("req.file:", !!req.file);
    console.log("req.body:", req.body);
    console.log("req.user:", req.user?._id);

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const file = req.file;

    // 🔥 CRITICAL FIX: normalize folderId
    let { folderId } = req.body;
    const folder =
      folderId === "null" || !folderId ? null : folderId;

    // Generate unique S3 key
    const fileKey = `uploads/${req.user._id}/${uuidv4()}-${file.originalname}`;

    // Upload to S3
    const uploader = new Upload({
      client: s3,
      params: {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      },
    });

    await uploader.done();

    // Save metadata in MongoDB
    const savedFile = await File.create({
      name: file.originalname,
      s3Key: fileKey,
      size: file.size,
      mimetype: file.mimetype,
      owner: req.user._id,
      folder,
    });

    res.status(201).json({
      message: "File uploaded successfully",
      file: savedFile,
    });
  } catch (error) {
    console.error("UPLOAD ERROR 👉", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * ===============================
 * LIST FILES
 * ===============================
 */
export const listFiles = async (req, res) => {
  try {
    const { folder } = req.query;

    const files = await File.find({
      owner: req.user._id,
      folder: folder || null,
    }).sort({ createdAt: -1 });

    res.json(files);
  } catch (error) {
    console.error("LIST FILES ERROR 👉", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * ===============================
 * DOWNLOAD FILE
 * ===============================
 */
export const downloadFile = async (req, res) => {
  try {
    const { id } = req.params;

    const file = await File.findOne({
      _id: id,
      owner: req.user._id,
    });

    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: file.s3Key,
    });

    const s3Response = await s3.send(command);

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${file.name}"`
    );
    res.setHeader("Content-Type", file.mimetype);

    s3Response.Body.pipe(res);
  } catch (error) {
    console.error("DOWNLOAD ERROR 👉", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * ===============================
 * DELETE FILE
 * ===============================
 */
export const deleteFile = async (req, res) => {
  try {
    const { id } = req.params;

    const file = await File.findOne({
      _id: id,
      owner: req.user._id,
    });

    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: file.s3Key,
      })
    );

    await file.deleteOne();

    res.json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("DELETE ERROR 👉", error);
    res.status(500).json({ message: error.message });
  }
};
