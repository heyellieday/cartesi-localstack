use hyper::{Body, Client, Request, Uri, Method};
use hyper::client::HttpConnector;
use tokio;
use dotenv::dotenv;
use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();
    let client = Client::builder().build::<_, hyper::Body>(HttpConnector::new());

    let cid = env::var("CID").expect("CID not found in .env file");

    // Sample
    let dag_data = r#"{"data": "This is a sample DAG node data"}"#;
    let ipfs_uri = Uri::from_static("http://localhost:8080/ipfs/api/v0/dag/import");
    let req_ipfs = Request::builder()
        .method(Method::POST)
        .uri(ipfs_uri)
        .body(Body::from(dag_data))
        .expect("Failed to build IPFS request.");
    let resp_ipfs = client.request(req_ipfs).await?;
    println!("IPFS Response: {}", resp_ipfs.status());

    // sample
    let compute_data = "compute this string";
    let lambada_uri_str = format!("http://localhost:8080/lambada/compute/{}", cid);
    let lambada_uri = lambada_uri_str.parse::<Uri>().expect("Failed to parse URI for Lambada");
    let req_lambada = Request::builder()
        .method(Method::POST)
        .uri(lambada_uri)
        .body(Body::from(compute_data))
        .expect("Failed to build Lambada request.");
    let resp_lambada = client.request(req_lambada).await?;
    println!("Lambada Response: {}", resp_lambada.status());

    Ok(())
}
