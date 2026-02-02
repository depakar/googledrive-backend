import Folder from "../models/Folder.js";
import File from "../models/File.js";
import s3 from "../config/aws.js";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";


export const createFolder = async (req, res) => {
  try {
    const { name, parent } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Folder name is required" });
    }

    const folder = await Folder.create({
      name,
      parent: parent || null,
      owner: req.user._id, // from JWT middleware
    });

    res.status(201).json({
      message: "Folder created successfully",
      folder,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const getFolders = async (req, res) => {
  try {
    const { parent } = req.query;

    const folders = await Folder.find({
      owner: req.user._id,
      parent: parent || null,
    }).sort({ createdAt: -1 });

    res.json(folders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const deleteFolderRecursive = async (folderId, userId) => {
  // 1. Find child folders
  const childFolders = await Folder.find({
    parent: folderId,
    owner: userId,
  });

  for (const child of childFolders) {
    await deleteFolderRecursive(child._id, userId);
  }

  // 2. Find files inside this folder
  const files = await File.find({
    folder: folderId,
    owner: userId,
  });

  for (const file of files) {
    // Delete from S3
    await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: file.s3Key,
      })
    );

    // Delete file metadata
    await file.deleteOne();
  }

  // 3. Delete folder itself
  await Folder.deleteOne({ _id: folderId, owner: userId });
};


export const deleteFolder = async (req, res) => {
  try {
    const { folderId } = req.params;

    const folder = await Folder.findOne({
      _id: folderId,
      owner: req.user._id,
    });

    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    await deleteFolderRecursive(folderId, req.user._id);

    res.status(200).json({ message: "Folder deleted successfully" });
  } catch (error) {
    console.error("Folder deletion error:", error);
    res.status(500).json({ message: "Failed to delete folder" });
  }
};

