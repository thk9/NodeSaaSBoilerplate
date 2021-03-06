import getListByPaginationAndFiltersSchema from "./../../../framework/graphql/getListByPaginationAndFiltersSchema.js"

export default `
	type ForgetPassword {
		_id: String
		id: Int
		email: String
		token: String
		successMessage: String
		successMessageType: String
		created_at: String
		updated_at: String
	}
	${getListByPaginationAndFiltersSchema("ForgetPassword")}
	input ForgetPasswordInput {
		_id: String
		id: Int
		email: String
		token: String
	}
`;