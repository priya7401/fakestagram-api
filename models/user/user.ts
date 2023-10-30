import mongoose from "mongoose";
import * as EmailValidator from 'email-validator';
import { attachmentSchema } from "../attachment/attachment.ts";

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
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    strictPopulate: false,
  }
);

userSchema.methods.toJSON = function () {
    var obj = this.toObject();
    delete obj.password_hash;
    return obj;
}

const User = mongoose.model("User", userSchema);

export default User;