/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// MY_KV_NAMESPACE: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	MY_BUCKET: R2Bucket;
	//
	// Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
	// MY_SERVICE: Fetcher;
	//
	// Example binding to a Queue. Learn more at https://developers.cloudflare.com/queues/javascript-apis/
	// MY_QUEUE: Queue;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const cookie = request.headers.get('Cookie');

		if (cookie && cookie.includes('CF_Authorization')) {
			// Split the cookie string by semicolons and find the CF_Authorization value
			const authValue = cookie
				.split(';')
				.find((c) => c.trim().startsWith('CF_Authorization'))
				?.split('=')[1];

			if (authValue) {
				// Send a request to the Cloudflare Access identity endpoint with the cookie
				const identityUrl = `https://hackerwell.cloudflareaccess.com/cdn-cgi/access/get-identity`;
				const identityResponse = await fetch(identityUrl, {
					headers: { Cookie: `CF_Authorization=${authValue}` },
				});

				// Parse the identity response as JSON
				const identityData = (await identityResponse.json()) as any;

				// Get the cf object from the request headers
				const country = request.headers.get('CF-IPCountry');
				const timeZone = request.headers.get('timezone') || 'Asia/Kuala_Lumpur';
				const timestamp = new Date().toLocaleString('en-US', { timeZone });
				// Get the request URL
				const url = new URL(request.url);

				// Check if the request path includes a country code
				if (url.pathname === `/secure/${country}`) {
					// Get the flag asset from the R2 bucket using the country code as the key
					const image = await env.MY_BUCKET.get(`${country}.png`);

					if (image === null) {
						return new Response('Image Not Found', { status: 404 });
					}
					// Return the flag asset as a response with the appropriate content type
					return new Response(image.body, {
						headers: {
							'Content-Type': 'image/png',
						},
					});
				}

				// Return the email and timestamp from the identity data
				//return new Response(`${identityData.email} authenticated at ${timestamp} from ${country}`);
				const html = `<!DOCTYPE html>
					<body>
			  			<p>${identityData.email} authenticated at ${timestamp} from <a href="${url.origin}/secure/${country}">${country}</a></p>
					</body>`;

				return new Response(html, {
					headers: {
						'content-type': 'text/html',
					},
				});
			}
		}

		return new Response();
	},
};
