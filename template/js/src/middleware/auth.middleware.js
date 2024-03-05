import jwt from "jsonwebtoken";
import { appConfig } from "../utils/env.utils.js";
import { responseUtils } from "../utils/response.utils.js";
import { readUsers } from "../service/user/user.service.js";
import { caching } from "../utils/cache.utils.js";

export const auth = (isAdmin) => {
  return async (req, res, next) => {
    let token;

    if (req.headers.authorization?.startsWith("Bearer") === true) {
      try {
        token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, appConfig.jwtSecret);

        if (decoded) {
          const _id = decoded._id;
          const user = await caching(`user/${_id}`, () => readUsers({
            _id, isDeleted: false,
          }, {
            projection: {
              password: 0,
            },
          }), 3600 * 24 * 7);

          if (!user || user.count === 0) {
            return responseUtils(res, {
              status: 401,
              success: false,
              message: "Unauthorized",
              data: null,
            });
          }

          // check admin or not if the router only access by admin
          if (isAdmin && !user.docs[0].isAdmin) {
            return responseUtils(res, {
              status: 401,
              success: false,
              message: "Unauthorized",
              data: null,
            });
          }

          req.user = {
            _id: user.docs[0]._id.toString(),
            email: user.docs[0].email,
            isAdmin: user.docs[0].isAdmin,
            org: user.docs[0].org?.toString() || "",
          };
          next();
        } else {
          return responseUtils(res, {
            status: 401,
            success: false,
            message: "Unauthorized",
            data: null,
          });
        }
      } catch (error) {
        console.error(error);
        return responseUtils(res, {
          status: 401,
          success: false,
          message: "Unauthorized",
          data: null,
        });
      }
    }
    if (!token) {
      return responseUtils(res, {
        status: 401,
        success: false,
        message: "Unauthorized, token is missing",
        data: null,
      });
    }
  };
};