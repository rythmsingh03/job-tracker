import React, { useContext, useEffect, useReducer } from "react";
import axios from "axios";
import reducer from "./reducers";
import {
  DISPLAY_ALERT,
  CLEAR_ALERT,
  TOGGLE_SIDEBAR,
  PROFILE_EDITING,
  SAVE_PROFILE_CHANGES,
  SET_EDIT_JOB,
  REGISTER_USER_BEGIN,
  REGISTER_USER_SUCCESS,
  REGISTER_USER_ERROR,
  LOGIN_USER_BEGIN,
  LOGIN_USER_SUCCESS,
  LOGIN_USER_ERROR,
  LOGOUT_USER,
  UPDATE_USER_BEGIN,
  UPDATE_USER_SUCCESS,
  UPDATE_USER_ERROR,
  GET_INPUT_VALUE,
  ADD_JOB_BEGIN,
  ADD_JOB_SUCCESS,
  ADD_JOB_ERROR,
  CLEAR_VALUES,
  GET_JOBS_BEGIN,
  GET_JOBS_SUCCESS,
  EDIT_JOB_BEGIN,
  EDIT_JOB_SUCCESS,
  EDIT_JOB_ERROR,
  DELETE_JOB,
  CHANGE_PAGE,
  GET_STATS_BEGIN,
  GET_STATS_SUCCESS,
  CLEAR_SEARCHING_FILTERS,
  GET_CURRENT_USER_BEGIN,
  GET_CURRENT_USER_SUCCESS,
} from "./actions";

const initialState = {
  showLargeSidebar: false,
  showSidebar: false,
  isProfileInputsActive: false,
  isEditing: false,
  isLoading: false,
  showAlert: false,
  alertType: "",
  alertText: "",
  user: null,
  userLoading: true,
  userLocation: "",
  editJobId: "",
  company: "",
  position: "",
  jobLocation: "",
  recruiter: "",
  recruiterEmail: "",
  salaryMin: 0,
  salaryMax: 0,
  interviewScheduledAt: null,
  jobType: "full-time",
  jobTypeOptions: ["full-time", "part-time", "remote", "hybrid"],
  statusOptions: ["pending", "interview", "declined"],
  jobStatus: "pending",
  priority: "Medium",
  priorityOptions: ["High", "Medium", "Low"],

  search: "",
  searchJobStatus: "all",
  searchJobType: "all",
  sort: "latest",
  sortOptions: ["latest", "oldest", "a-z", "z-a", "priority"],
  jobs: [],
  totalJobs: 0,
  page: 1,
  numOfPages: 1,
  visiblePages: [],
  stats: {},
  monthlyApplications: [],
};

const AppContext = React.createContext();

const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const authFetch = axios.create({ baseURL: "/api/v1" });

  authFetch.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response.status === 401) logoutUser();
      return Promise.reject(error);
    }
  );

  const displayAlert = () => {
    dispatch({ type: DISPLAY_ALERT });
    setTimeout(() => dispatch({ type: CLEAR_ALERT }), 3000);
  };

  const toggleSidebar = () => dispatch({ type: TOGGLE_SIDEBAR });
  const showProfileEditingInputs = () => dispatch({ type: PROFILE_EDITING });
  const saveProfileChanges = () => dispatch({ type: SAVE_PROFILE_CHANGES });

  const registerUser = async (currentUser) => {
    dispatch({ type: REGISTER_USER_BEGIN });
    try {
      const { data } = await authFetch.post("/auth/register", currentUser);
      dispatch({
        type: REGISTER_USER_SUCCESS,
        payload: { user: data.user, userLocation: data.userLocation },
      });
    } catch (error) {
      dispatch({
        type: REGISTER_USER_ERROR,
        payload: { message: error.response.data.message },
      });
    }
    displayAlert();
  };

  const loginUser = async (currentUser) => {
    dispatch({ type: LOGIN_USER_BEGIN });
    try {
      const { data } = await authFetch.post("/auth/login", currentUser);
      dispatch({
        type: LOGIN_USER_SUCCESS,
        payload: { user: data.user, userLocation: data.userLocation },
      });
    } catch (error) {
      dispatch({
        type: LOGIN_USER_ERROR,
        payload: { message: error.response.data.message },
      });
    }
    displayAlert();
  };

  const logoutUser = async () => {
    await authFetch("/auth/logout");
    dispatch({ type: LOGOUT_USER });
  };

  const updateUser = async (currentUser) => {
    dispatch({ type: UPDATE_USER_BEGIN });
    try {
      const { data } = await authFetch.patch("/auth/updateUser", currentUser);
      dispatch({
        type: UPDATE_USER_SUCCESS,
        payload: { user: data.user, userLocation: data.userLocation },
      });
    } catch (error) {
      if (error.response.status !== 401) {
        dispatch({
          type: UPDATE_USER_ERROR,
          payload: { message: error.response.data.message },
        });
      }
    }
    displayAlert();
  };

  const getInputValues = ({ name, value }) => {
    dispatch({ type: GET_INPUT_VALUE, payload: { name, value } });
  };

  const clearInputValues = () => dispatch({ type: CLEAR_VALUES });

  const addJob = async () => {
    dispatch({ type: ADD_JOB_BEGIN });
    try {
      const {
        company,
        position,
        jobLocation,
        recruiter,
        recruiterEmail,
        salaryMin,
        salaryMax,
        interviewScheduledAt,
        jobType,
        jobStatus,
        priority, // ✅ Added priority
      } = state;

      await authFetch.post("/jobs", {
        company,
        position,
        jobLocation,
        recruiter,
        recruiterEmail,
        salaryMin,
        salaryMax,
        interviewScheduledAt,
        jobType,
        jobStatus,
        priority, // ✅ Send priority to backend
      });

      dispatch({ type: ADD_JOB_SUCCESS });
    } catch (error) {
      if (error.response.status !== 401) {
        dispatch({
          type: ADD_JOB_ERROR,
          payload: { message: error.response.data.message },
        });
      }
    }
    displayAlert();
  };

  const getAllJobs = async () => {
    const { page, search, searchJobStatus, searchJobType, sort } = state;
    let url = `/jobs?page=${page}&jobType=${searchJobType}&jobStatus=${searchJobStatus}&sort=${sort}`;
    if (search) url += `&search=${search}`;

    dispatch({ type: GET_JOBS_BEGIN });

    try {
      const { data } = await authFetch(url);
      dispatch({
        type: GET_JOBS_SUCCESS,
        payload: {
          jobs: data.jobs,
          totalJobs: data.totalJobs,
          numOfPages: data.numOfPages,
        },
      });
    } catch (error) {
      logoutUser();
    }
    displayAlert();
  };

  const setEditJob = (isEditing, id) => {
    dispatch({ type: SET_EDIT_JOB, payload: { isEditing, id } });
  };

  const editJob = async () => {
    dispatch({ type: EDIT_JOB_BEGIN });

    try {
      const {
        company,
        position,
        jobLocation,
        recruiter,
        recruiterEmail,
        salaryMin,
        salaryMax,
        interviewScheduledAt,
        jobType,
        jobStatus,
        priority, // ✅ Include priority in editing
      } = state;

      await authFetch.patch(`/jobs/${state.editJobId}`, {
        company,
        position,
        jobLocation,
        recruiter,
        recruiterEmail,
        salaryMin,
        salaryMax,
        interviewScheduledAt,
        jobType,
        jobStatus,
        priority, // ✅ Send updated priority
      });

      dispatch({ type: EDIT_JOB_SUCCESS });
      dispatch({ type: CLEAR_VALUES });
    } catch (error) {
      if (error.response.status !== 401) {
        dispatch({
          type: EDIT_JOB_ERROR,
          payload: { message: error.response.data.message },
        });
      }
    }

    displayAlert();
  };

  const deleteJob = async (id) => {
    dispatch({ type: DELETE_JOB });
    try {
      await authFetch.delete(`/jobs/${id}`);
      getAllJobs();
    } catch (error) {
      logoutUser();
    }
  };

  const changePage = (page) =>
    dispatch({ type: CHANGE_PAGE, payload: { page } });

  const getStats = async () => {
    dispatch({ type: GET_STATS_BEGIN });

    try {
      const { data } = await authFetch("/jobs/stats");
      dispatch({
        type: GET_STATS_SUCCESS,
        payload: {
          stats: data.defaultStats,
          monthlyApplications: data.monthlyApplications,
        },
      });
    } catch (error) {
      logoutUser();
    }

    displayAlert();
  };

  const clearSearchingFilters = () =>
    dispatch({ type: CLEAR_SEARCHING_FILTERS });

  const getCurrentUser = async () => {
    dispatch({ type: GET_CURRENT_USER_BEGIN });

    try {
      const { data } = await authFetch("/auth/getCurrentUser");
      dispatch({
        type: GET_CURRENT_USER_SUCCESS,
        payload: { user: data.user, userLocation: data.userLocation },
      });
    } catch (error) {
      if (error.response.status === 401) return;
      logoutUser();
    }
  };

  useEffect(() => {
    getCurrentUser();
  }, []);

  return (
    <AppContext.Provider
      value={{
        ...state,
        displayAlert,
        toggleSidebar,
        showProfileEditingInputs,
        saveProfileChanges,
        setEditJob,
        registerUser,
        loginUser,
        logoutUser,
        updateUser,
        getInputValues,
        addJob,
        clearInputValues,
        getAllJobs,
        editJob,
        deleteJob,
        changePage,
        getStats,
        clearSearchingFilters,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

const useAppContext = () => useContext(AppContext);

export { AppProvider, initialState, useAppContext };
