// `server-only` is resolved by Next itself (an empty module on the server, a build error in a
// client bundle); the npm package is not installed. Tests run server code, so they get the
// server's empty module too. See spec 07.
export {};
