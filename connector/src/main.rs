use std::net::TcpListener;
use std::thread::spawn;
use tungstenite::accept_hdr;
use tungstenite::handshake::server::{Request, Response};

fn main() {
    let server = TcpListener::bind("127.0.0.1:3000").unwrap();
    for stream in server.incoming() {
        spawn(move || {
            let callback = |req: &Request, mut response: Response| {
                println!("Received a new ws handshake");
                println!("The request's path is: {}", req.uri().path());
                println!("The request's headers are:");
                for (ref header, _value) in req.headers() {
                    println!("* {}", header);
                }

                // Add header to specify the subprotocol we are speaking.
                let headers = response.headers_mut();
                headers.append("Sec-WebSocket-Protocol", "tilt5-protocol".parse().unwrap());

                Ok(response)
            };
            let mut websocket = accept_hdr(stream.unwrap(), callback).unwrap();
            loop {
                let msg = websocket.read_message().unwrap();
                // println!("{:?}", msg);

                if msg.is_binary() || msg.is_text() {
                    // websocket.write_message(msg).unwrap();
                }
            }
        });
    }
}
