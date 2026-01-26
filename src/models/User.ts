import mongoose, {InferSchemaType, Schema, Model } from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new Schema({
  username: {
    type: String,
    required: false,
    unique: true, //keep this if usernames must be unique per user
    sparse: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: false,
    minlength: 8,
    select: false
  },
  name: {
    type: String,
    required: false,
    trim: true
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true // allows multiple nulls (not all users have Google)
  },
  avatar: {
    url: { type: String },
    filename: { type: String }
  },
  resetPasswordToken: {
    type: String,
    index: true
  },
  resetPasswordExpires: Date,

  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  otp: {
    type: String
  },
  otpExpires: {
    type: Date
  },
  lastOtpSentAt: {
    type: Date, // new field
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true
});

// Hash passwords before saving
userSchema.pre('save', async function (this: UserDocument) { //before saving. pre save
  if (this.isModified('password') && this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  // Set avatar if not set
  if (!this.avatar?.url) {
    if (this.googleId && this.avatar?.url) {
      // Use Google avatar if user signed up with Google
    } else {
      this.avatar = {
        url: ``,
        filename: '',
      };
    }
  }
});

// Adding indexes for better performance
userSchema.index({ name: 1 }); 
userSchema.index({ isActive: 1 });

// --- add method typing ---
userSchema.methods.matchPassword = async function (enteredPassword: string): Promise<boolean> {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Infer fields
export type UserFields = InferSchemaType<typeof userSchema>;

// Extend with methods
export interface UserDocument extends UserFields, mongoose.Document {
  matchPassword(enteredPassword: string): Promise<boolean>;
}

// Use extended type in model
export const User: Model<UserDocument> = mongoose.model<UserDocument>("User", userSchema);