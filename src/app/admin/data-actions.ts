"use server";

import mongoose from "mongoose";
import Signup from "@/models/signup.model";
import Scan from "@/models/scan.model";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "./actions";
import dbConnection from "@/connection/dbconnection";

export async function getUsers() {
    await requireAdmin();
    try {
        await dbConnection();
        const users = await Signup.find();
        // Convert ObjectId to string for client components
        console.log("Userss: ", users)
        return { success: true, data: JSON.parse(JSON.stringify(users)) };
    } catch (error) {
        console.error("Failed to fetch users:", error);
        return { success: false, error: "Failed to fetch users" };
    }
}

export async function deleteUser(id: string) {
    await requireAdmin();
    try {
        await dbConnection();
        await Signup.findByIdAndDelete(id);
        // Also optionally delete their scans to maintain referential integrity
        await Scan.deleteMany({ userId: id });
        revalidatePath("/admin/users");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete user:", error);
        return { success: false, error: "Failed to delete user" };
    }
}

export async function getPredictions() {
    await requireAdmin();
    try {
        await dbConnection();
        // Populate user email if we want to show who made the prediction
        const predictions = await Scan.find({})
            .sort({ createdAt: -1 })
            .populate({ path: "userId", select: "email", model: Signup })
            .lean();
        return { success: true, data: JSON.parse(JSON.stringify(predictions)) };
    } catch (error) {
        console.error("Failed to fetch predictions:", error);
        return { success: false, error: "Failed to fetch predictions" };
    }
}

export async function deletePrediction(id: string) {
    await requireAdmin();
    try {
        await dbConnection();
        await Scan.findByIdAndDelete(id);
        revalidatePath("/admin/predictions");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete prediction:", error);
        return { success: false, error: "Failed to delete prediction" };
    }
}
