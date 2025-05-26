import mongoose, { Schema, Document, models, Model } from 'mongoose';

// Interface for the Location subdocument
export interface ILocationSubDocument extends Document {
  latitude: number;
  longitude: number;
  accuracy: number;
  address?: string;
}

// Interface for the Attendance document
export interface IAttendance extends Document {
  imageUrl: string;
  timestamp: Date;
  location: ILocationSubDocument;
  recordedAt: Date;
}

const LocationSchema: Schema<ILocationSubDocument> = new Schema({
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  accuracy: { type: Number, required: true },
  address: { type: String, trim: true },
});

const AttendanceSchema: Schema<IAttendance> = new Schema({
  imageUrl: { type: String, required: true },
  timestamp: { type: Date, required: true }, // The timestamp from the client device when photo was taken
  location: { type: LocationSchema, required: true },
  recordedAt: { type: Date, default: Date.now, required: true }, // Server timestamp when record is created
});

// To prevent model recompilation in Next.js/Vercel serverless environments
// during hot-reloading or multiple invocations.
const Attendance: Model<IAttendance> =
  models.Attendance || mongoose.model<IAttendance>('Attendance', AttendanceSchema);

export default Attendance;