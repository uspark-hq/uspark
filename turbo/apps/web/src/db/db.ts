import * as userSchema from "./schema/user";
import * as deviceCodesSchema from "./schema/device-codes";

export const schema = {
  ...userSchema,
  ...deviceCodesSchema,
};
