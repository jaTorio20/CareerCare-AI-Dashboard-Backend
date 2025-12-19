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
    required: true,
    minlength: 6,
    // select: false
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true // allows multiple nulls (not all users have Google)
  },
  avatar: {
    url: String,
    filename: String
  },
  resetPasswordToken: {
    type: String,
    // index: true
  },
  resetPasswordExpires: Date,

  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  }
}, {
  timestamps: true
});

// Hash passwords before saving
userSchema.pre('save', async function () { //before saving. pre save
  if(!this.isModified('password')) return; //check if password is not modified next() middleware is not needed

  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt);

});

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