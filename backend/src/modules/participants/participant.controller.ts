import { ApiResponse } from "@/utils/ApiResponse.js";
import { asyncHandler } from "@/utils/asyncHandler.js";
import { validate } from "@/utils/validate.js";
import { joinSessionSchema } from "./participant.schema.js";
import { participantService } from "./participant.service.js";

export const joinSession = asyncHandler(async (req, res) => {
  const validatedBody = await validate(req.body, joinSessionSchema);
  const result = await participantService.joinSession(validatedBody);

  res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      message: "Joined session successfully",
      data: result,
    })
  );
});
