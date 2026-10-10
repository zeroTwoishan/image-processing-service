import mongoose from 'mongoose';

// Give up after 5s instead of the default 30s when Mongo isn't reachable.
export const connectDb = (uri) => mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });

export const disconnectDb = () => mongoose.disconnect();
