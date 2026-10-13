import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    // unique creates a unique index: Mongo itself refuses a second "ishan", even if two requests race.
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
  },
  {
    timestamps: true, // adds createdAt / updatedAt (stored in UTC)
    toJSON: {
      // Runs whenever a user is sent in a response (res.json calls toJSON).
      transform(doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash; // never leaves the server, not even hashed
        return ret;
      },
    },
  },
);

export const User = mongoose.model('User', userSchema);
