import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";

const pkg = protoLoader.loadSync(
  "../../engine.proto"
);

const engine = new (grpc.loadPackageDefinition(pkg) as any)
  .engine.MatchingEngine(
    "engine:50051",
    grpc.credentials.createInsecure()
  );

export function submitOrder(order: any) {
  return new Promise((resolve, reject) => {
    engine.SubmitOrder({ order }, (err: any, res: any) => {
      if (err) return reject(err);
      resolve(res.trades);
    });
  });
}