export class JSONResponse extends Response {
  // deno-lint-ignore no-explicit-any
  constructor(body: any, status: number = 200) {
    super(JSON.stringify(body), {
      headers: { "Content-Type": "application/json" },
      status,
    });
  }
}
