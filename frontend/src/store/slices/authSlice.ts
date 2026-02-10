import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { authApi } from '../../services/api'

// Types
export interface User {
  id: string
  email: string
  username: string
  role: 'admin' | 'user'
  is_active: boolean
  created_at: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  otpEmail: string | null  // Store email for OTP verification
  otpSent: boolean
}

const initialState: AuthState = {
  user: null,
  accessToken: localStorage.getItem('access_token'),
  isAuthenticated: !!localStorage.getItem('access_token'),
  isLoading: false,
  error: null,
  otpEmail: null,
  otpSent: false,
}

// Async Thunks
export const signup = createAsyncThunk(
  'auth/signup',
  async (data: { email: string; password: string; username: string }, { rejectWithValue }) => {
    try {
      const response = await authApi.signup(data)
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Signup failed')
    }
  }
)

export const verifyOtp = createAsyncThunk(
  'auth/verify_otp',
  async (data: { email: string; otp: string }, { rejectWithValue }) => {
    try {
      const response = await authApi.verifyOtp(data)
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'OTP verification failed')
    }
  }
)

export const resendOtp = createAsyncThunk(
  'auth/resend_otp',
  async (email: string, { rejectWithValue }) => {
    try {
      const response = await authApi.resendOtp(email)
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to resend OTP')
    }
  }
)

export const login = createAsyncThunk(
  'auth/login',
  async (data: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await authApi.login(data)
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Login failed')
    }
  }
)

export const getMe = createAsyncThunk(
  'auth/getMe',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authApi.getMe()
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to get user')
    }
  }
)

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authApi.logout()
      return null
    } catch (error: any) {
      // Still logout locally even if API fails
      return null
    }
  }
)

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    setOtpEmail: (state, action: PayloadAction<string>) => {
      state.otpEmail = action.payload
    },
    clearOtpState: (state) => {
      state.otpEmail = null
      state.otpSent = false
    },
    checkAuthOnLoad: (state) => {
      const token = localStorage.getItem('access_token')
      if (token) {
        state.accessToken = token
        state.isAuthenticated = true
      }
    },
  },
  extraReducers: (builder) => {
    // Signup
    builder
      .addCase(signup.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(signup.fulfilled, (state, action) => {
        state.isLoading = false
        state.otpEmail = action.payload.email
        state.otpSent = true
      })
      .addCase(signup.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

    // Verify OTP
    builder
      .addCase(verifyOtp.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(verifyOtp.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.user
        state.accessToken = action.payload.access_token
        state.isAuthenticated = true
        state.otpEmail = null
        state.otpSent = false
        localStorage.setItem('access_token', action.payload.access_token)
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

    // Resend OTP
    builder
      .addCase(resendOtp.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(resendOtp.fulfilled, (state) => {
        state.isLoading = false
        state.otpSent = true
      })
      .addCase(resendOtp.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

    // Login
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.user
        state.accessToken = action.payload.access_token
        state.isAuthenticated = true
        localStorage.setItem('access_token', action.payload.access_token)
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

    // Get Me
    builder
      .addCase(getMe.pending, (state) => {
        state.isLoading = true
      })
      .addCase(getMe.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload
        state.isAuthenticated = true
      })
      .addCase(getMe.rejected, (state) => {
        state.isLoading = false
        state.isAuthenticated = false
        state.user = null
        state.accessToken = null
        localStorage.removeItem('access_token')
      })

    // Logout
    builder
      .addCase(logout.fulfilled, (state) => {
        state.user = null
        state.accessToken = null
        state.isAuthenticated = false
        state.otpEmail = null
        state.otpSent = false
        localStorage.removeItem('access_token')
      })
  },
})

export const { clearError, setOtpEmail, clearOtpState, checkAuthOnLoad } = authSlice.actions
export default authSlice.reducer
