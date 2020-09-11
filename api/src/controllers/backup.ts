import { Router } from 'express';
import asyncHandler from 'express-async-handler';
import DatabaseBackupService from '../services/backup';
import { PassThrough } from 'stream';

const router = Router();

router.get(
	'/',
	asyncHandler(async (req, res, next) => {
		const dbService = new DatabaseBackupService({ accountability: req.accountability });
		await dbService.cleanUp();
		const fileName = await dbService.exportDb();
		const fs = require('fs');
		res.attachment(fileName);
		res.set('Content-Type', 'application/sql');

		const stream = fs.createReadStream(fileName);

		stream.pipe(res);

		//this is needed because backup /dump methods only support local
		await dbService.cleanUp();

		return next();
	})
);

export default router;
