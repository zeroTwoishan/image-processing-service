import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

const BCRYPT_COST = env.BCRYPT_COST; // 12 = 2^12 rounds, a few hundred ms per hash: slow on purpose

// A real hash of a throwaway string, compared against when the username doesn't exist (see login).
const DUMMY_HASH = await bcrypt.hash('no-such-user', BCRYPT_COST);

// sub ("subject") is the standard JWT field for "who this token is about".
const signToken = (user) => jwt.sign({ sub: user.id }, env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '7d' });

export async function register(req, res) {
  const { username, password } = req.body;
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

  try {
    const user = await User.create({ username, passwordHash });
    res.status(201).json({ user, token: signToken(user) });
  } catch (err) {
    // 11000 = duplicate key. We don't check "does this username exist?" first, because two requests
    // could both see "no" and both insert. The unique index is the only check that can't race.
    if (err.code === 11000) throw new ApiError(409, 'USERNAME_TAKEN', 'That username is already taken');
    throw err;
  }
}

export async function login(req, res) {
  const { username, password } = req.body;
  const user = await User.findOne({ username });

  // Always run bcrypt, even for an unknown username, so both failures take the same ~250 ms
  // and an attacker can't tell from the response time which usernames exist.
  const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  // One message for both cases, for the same reason.
  if (!user || !passwordOk) throw new ApiError(401, 'UNAUTHORIZED', 'Wrong username or password');

  res.json({ user, token: signToken(user) });
}

export async function me(req, res) {
  const user = await User.findById(req.userId);
  // The token is valid, but the account may have been deleted since it was issued.
  if (!user) throw new ApiError(401, 'UNAUTHORIZED', 'Account no longer exists');
  res.json({ user });
}
