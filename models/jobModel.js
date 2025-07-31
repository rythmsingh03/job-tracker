import mongoose from "mongoose";
import validator from "validator";

const jobSchema = new mongoose.Schema(
  {
    position: {
      type: String,
      required: [true, "Please specify the job position"],
      maxLength: [100, "Position cannot be bigger than 100 characters"],
      trim: true,
    },
    company: {
      type: String,
      required: [true, "Please specify the company"],
      maxLength: [50, "Company name cannot be bigger than 50 characters"],
      trim: true,
    },
    jobLocation: {
      type: String,
      maxLength: [20, "Location can contain no more than 20 letters"],
      trim: true,
    },
    jobStatus: {
      type: String,
      enum: ["pending", "interview", "declined"],
      default: "pending",
    },
    jobType: {
      type: String,
      enum: ["part-time", "full-time", "remote", "hybrid"],
      default: "full-time",
    },
    recruiter: {
      type: String,
      maxLength: [30, "Recruiter's name cannot exceed 30 characters"],
      trim: true,
    },
    recruiterEmail: {
      type: String,
      trim: true,
      validate: {
        validator: validator.isEmail,
        message: "Please provide a valid email",
      },
    },
    salaryMin: {
      type: Number,
      min: 0,
      default: 0,
    },
    salaryMax: {
      type: Number,
      min: 0,
      default: 0,
    },
    interviewScheduledAt: {
      type: Date,
      min: Date.now(),
    },
    createdBy: {
      type: mongoose.Types.ObjectId,
      ref: "UserModel",
      required: [true, "Please provide the user associated with this job"],
    },
    priority: {
      type: String,
      enum: ["High", "Medium", "Low"],
      default: "Medium",
    },
    priorityLevel: {
      type: Number,
      default: 2, // Medium
    },
  },
  { timestamps: true }
);

const JobModel = mongoose.model("JobModel", jobSchema);

export default JobModel;
