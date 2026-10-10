import http from 'k6/http';
import { check, sleep } from 'k6';

const baseUrl = (__ENV.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const targetPath = __ENV.TARGET_PATH || '/health/live';
const accessToken = __ENV.ACCESS_TOKEN;

export const options = {
	stages: [
		{ duration: '1m', target: 10 },
		{ duration: '3m', target: 10 },
		{ duration: '1m', target: 0 },
	],
	thresholds: {
		http_req_failed: ['rate<0.01'],
		http_req_duration: ['p(95)<500', 'p(99)<1000'],
	},
};

export default function () {
	const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
	const response = http.get(`${baseUrl}${targetPath}`, { headers });
	check(response, {
		'status is successful': (result) =>
			result.status >= 200 && result.status < 300,
	});
	sleep(1);
}
