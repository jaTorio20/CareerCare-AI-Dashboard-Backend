// import { UserDocument } from "../models/User";

// declare global {
//   namespace Express {
//     interface User extends UserDocument {}
//   }
// }

// src/types/express.d.ts

import { UserDocument } from "../models/User";

declare global {
  namespace Express {
    interface User extends UserDocument {} // override Express.User globally
    interface Request {
      user?: User; // optional because protect middleware may not have run
    }
  }
}

