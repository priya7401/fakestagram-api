import mongoose from "mongoose";
import * as EmailValidator from 'email-validator';
import {
  AttachmentInterface,
  attachmentSchema,
} from "../attachment/attachment.ts";

interface UserInterface {
  user_name: string;
  full_name: string;
  email: string;
  password_hash: string;
  profile_pic: AttachmentInterface;
  bio: string;
  followers: [mongoose.Schema.Types.ObjectId];
  following: [mongoose.Schema.Types.ObjectId];
  follow_requests: [mongoose.Schema.Types.ObjectId];
  follow_suggestions: [mongoose.Schema.Types.ObjectId];
  pending_follow_requests: [mongoose.Schema.Types.ObjectId];
  is_public: boolean;
  invalidate_before: string;
}

const userSchema = new mongoose.Schema(
  {
    user_name: {
      type: String,
      validate: {
        validator: function (value: string | any) {
          return /^(?!.*\.\.)(?!.*\.$)[^\W][\w.]{0,29}$/.test(value);
        },
        message: "Enter valid username",
      },
      unique: [
        true,
        "Username already exists! Please choose a different username",
      ],
    },
    full_name: {
      type: String,
      maxLength: 1000,
      default: "",
    },
    email: {
      type: String,
      required: [true, "email is required"],
      unique: [true, "User already exists! Please login"],
      validate: [
        {
          validator: function (value: string | any) {
            return !(value == null || value.length == 0);
          },
          message: "email cannot be empty",
        },
        {
          validator: function (value: string) {
            return EmailValidator.validate(value);
          },
          message: "invalid email!",
        },
      ],
    },
    password_hash: {
      type: String,
      required: [true, "password is required"],
      minLength: [8, "Password must consist of minimum 8 characters"],
    },
    profile_pic: {
      type: attachmentSchema,
    },
    bio: {
      type: String,
      maxLength: 1000,
      default: "",
    },
    followers: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    following: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    follow_requests: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    follow_suggestions: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    pending_follow_requests: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    is_public: {
      type: Boolean,
      default: true,
    },
    invalidate_before: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    strictPopulate: false,
  }
);

userSchema.methods.toJSON = function () {
  var obj = this.toObject();
  delete obj.password_hash;
  delete obj.invalidate_before;
  return obj;
};

const User = mongoose.model<UserInterface>("User", userSchema);

export { User, UserInterface };