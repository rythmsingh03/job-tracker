import mongoose from "mongoose";
import moment from "moment";
import { StatusCodes } from "http-status-codes";
import JobModel from "../models/jobModel.js";
import { BadRequestError } from "../errors/index.js";
import checkPermissions from "../utils/checkPermissions.js";

// Helper: Convert priority string to numeric level for sorting
const getPriorityLevel = (priority) => {
  switch (priority) {
    case "High":
      return 1;
    case "Medium":
      return 2;
    case "Low":
      return 3;
    default:
      return 2; // fallback
  }
};

const getJobs = async (req, res) => {
  const { search, jobType, jobStatus, sort } = req.query;
  const queryObject = { createdBy: req.user.userId };

  // Filtering
  if (search) {
    queryObject.position = { $regex: search, $options: "i" };
  }
  if (jobType && jobType !== "all") {
    queryObject.jobType = jobType;
  }
  if (jobStatus && jobStatus !== "all") {
    queryObject.jobStatus = jobStatus;
  }

  let result = JobModel.find(queryObject);

  // Sorting
  switch (sort) {
    case "latest":
      result = result.sort("-createdAt");
      break;
    case "oldest":
      result = result.sort("createdAt");
      break;
    case "a-z":
      result = result.sort("position");
      break;
    case "z-a":
      result = result.sort("-position");
      break;
    case "priority-high":
      result = result.sort("priorityLevel");
      break;
    case "priority-low":
      result = result.sort("-priorityLevel");
      break;
    default:
      result = result.sort("-createdAt");
  }

  // Pagination
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  result = result.skip(skip).limit(limit);

  const jobs = await result;
  const totalJobs = await JobModel.countDocuments(queryObject);
  const numOfPages = Math.ceil(totalJobs / limit);

  res.status(StatusCodes.OK).json({
    status: "success",
    totalJobs,
    numOfPages,
    jobs,
  });
};

const addJob = async (req, res) => {
  const { position, company, jobStatus, priority, interviewScheduledAt } =
    req.body;

  if (!position || !company) {
    throw new BadRequestError("Please provide position and company!");
  }

  if (jobStatus === "interview" && !interviewScheduledAt) {
    throw new BadRequestError("Please provide the interview date and time!");
  }

  req.body.createdBy = req.user.userId;
  req.body.priorityLevel = getPriorityLevel(priority);

  const job = await JobModel.create(req.body);

  res.status(StatusCodes.CREATED).json({
    status: "success",
    job,
  });
};

const editJob = async (req, res) => {
  const { company, position, jobStatus, priority, interviewScheduledAt } =
    req.body;

  if (!company || !position) {
    throw new BadRequestError("Please provide position and company!");
  }

  if (jobStatus === "interview" && !interviewScheduledAt) {
    throw new BadRequestError("Please provide the interview date and time!");
  }

  const job = await JobModel.findOne({ _id: req.params.id });
  if (!job) {
    throw new BadRequestError(`No job found with id: ${req.params.id}`);
  }

  checkPermissions(req.user, job.createdBy);
  req.body.priorityLevel = getPriorityLevel(priority);

  const updatedJob = await JobModel.findOneAndUpdate(
    { _id: req.params.id },
    req.body,
    { new: true, runValidators: true }
  );

  res.status(StatusCodes.OK).json({
    status: "success",
    updatedJob,
  });
};

const deleteJob = async (req, res) => {
  const job = await JobModel.findOne({ _id: req.params.id });
  if (!job) {
    throw new BadRequestError(`No job found with id: ${req.params.id}`);
  }

  checkPermissions(req.user, job.createdBy);
  await JobModel.findOneAndDelete({ _id: req.params.id });

  res.status(StatusCodes.OK).json({
    status: "success",
    message: "The job has been deleted!",
  });
};

const getStats = async (req, res) => {
  let stats = await JobModel.aggregate([
    { $match: { createdBy: new mongoose.Types.ObjectId(req.user.userId) } },
    { $group: { _id: "$jobStatus", count: { $sum: 1 } } },
  ]);

  stats = stats.reduce((acc, curr) => {
    const { _id, count } = curr;
    acc[_id] = count;
    return acc;
  }, {});

  const defaultStats = {
    pending: stats.pending || 0,
    interview: stats.interview || 0,
    declined: stats.declined || 0,
  };

  let monthlyApplications = await JobModel.aggregate([
    { $match: { createdBy: new mongoose.Types.ObjectId(req.user.userId) } },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": -1, "_id.month": -1 } },
    { $limit: 8 },
  ]);

  monthlyApplications = monthlyApplications
    .map((item) => {
      const {
        _id: { year, month },
        count,
      } = item;
      const date = moment()
        .month(month - 1)
        .year(year)
        .format("MMM Y");
      return { date, count };
    })
    .reverse();

  res.status(StatusCodes.OK).json({
    status: "success",
    defaultStats,
    monthlyApplications,
  });
};

export { getJobs, addJob, editJob, deleteJob, getStats };
