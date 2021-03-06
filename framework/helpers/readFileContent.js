import fs from "fs";
export default function (directory) {
	return new Promise((resolve,reject) => {
		fs.readFile(directory,"utf8",function (err,data) {
			if (err) {
				reject(err);
			}else {
				resolve(data);
			}
		});
	})
}