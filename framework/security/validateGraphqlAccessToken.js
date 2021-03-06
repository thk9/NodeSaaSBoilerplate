import {get} from "lodash";
const allowGraphql  = get(process,'env.ALLOW_GRAPHQL','FALSE') === "TRUE";
import isTokenValid from "./isTokenValid.js";
import isPublicToken from "./isPublicToken.js";
import isAuthQuery from "./isAuthQuery.js";
export default async function (req,res,next) {
	let method = req.method.toLowerCase();
	if (method == "get" || allowGraphql) {
		next();
		return;
	}
	let query = get(req,'body.query','');
	if (!query) {
		return res.json({
			errorMessageType: "Error",
			errorMessage: "Query is required",
		});
	}
	let token = get(req,'headers.authorization','');
	let passQuery = isAuthQuery(query);
	if (passQuery) {
		return next();
	}
	let isPublic = isPublicToken(token);
	if (isPublic) {
		next();
	}
	let user = await isTokenValid(token);
	let isCorrectAccessToken = get(user,'id',false);
	if (!isCorrectAccessToken) {
		res.json({
			errorMessageType: "Error",
			errorMessage: "JWT token mismatched or incorrect",
		});
		return;
	}
	next();
}