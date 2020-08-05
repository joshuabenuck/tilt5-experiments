use ggez::{Context, GameError, GameResult};
use image;
use std::net::TcpListener;
use std::sync::mpsc::{self, Receiver, Sender};
use std::thread::spawn;
use tungstenite::accept_hdr;
use tungstenite::handshake::server::{Request, Response};
use tungstenite::Message;

struct Tilt5View {
    rx: Receiver<Vec<u8>>,
    image: Option<ggez::graphics::Image>,
    width: u32,
    height: u32,
}

impl ggez::event::EventHandler for Tilt5View {
    fn update(&mut self, ctx: &mut Context) -> GameResult {
        match self.rx.recv_timeout(std::time::Duration::from_millis(1)) {
            Ok(blob) => {
                let img = image::load_from_memory(&blob)
                    .map_err(|e| GameError::EventLoopError(e.to_string()))?
                    .to_rgba();

                let width = img.width();
                let height = img.height();
                self.image = Some(ggez::graphics::Image::from_rgba8(
                    ctx,
                    width as u16,
                    height as u16,
                    &img,
                )?);
                if self.width != width || self.height != height {
                    ggez::graphics::set_drawable_size(ctx, width as f32, height as f32)?;
                    ggez::graphics::set_screen_coordinates(
                        ctx,
                        [0.0, 0.0, width as f32, height as f32].into(),
                    )?;
                    self.width = width;
                    self.height = height;
                }
            }
            Err(_) => {}
        }
        Ok(())
    }

    fn draw(&mut self, ctx: &mut Context) -> GameResult {
        ggez::graphics::clear(ctx, ggez::graphics::WHITE);
        // let dest = ggez::nalgebra::Point2::new(0.0, 0.0);
        if let Some(image) = &self.image {
            ggez::graphics::draw(ctx, image, ggez::graphics::DrawParam::default())?;
        }
        ggez::graphics::present(ctx)?;
        Ok(())
    }
}

fn start_websocket_thread(tx: Sender<Vec<u8>>) {
    spawn(move || {
        let server = TcpListener::bind("127.0.0.1:3000").unwrap();
        for stream in server.incoming() {
            let thread_tx = tx.clone();
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
                    match msg {
                        Message::Binary(blob) => match thread_tx.send(blob) {
                            Ok(_) => {}
                            Err(err) => println!("Error: {}", err.to_string()),
                        },
                        _ => {}
                    }
                }
            });
        }
    });
}

fn main() -> GameResult {
    let (tx, rx) = mpsc::channel::<Vec<u8>>();
    start_websocket_thread(tx);
    let tilt5 = &mut Tilt5View {
        rx,
        image: None,
        width: 0,
        height: 0,
    };
    let mut setup = ggez::conf::WindowSetup::default();
    setup.title = "Tilt5 Experiments".to_string();
    let cb = ggez::ContextBuilder::new("Til5 Experiments", "Deno Days").window_setup(setup);
    let (ctx, event_loop) = &mut cb.build()?;
    ggez::event::run(ctx, event_loop, tilt5)?;
    Ok(())
}
