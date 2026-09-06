export type ChannelHandler<TPayload = unknown, TResult = unknown> = (
  payload: TPayload,
) => TResult | Promise<TResult>;

export interface HostChannel {
  request<TPayload = unknown, TResult = unknown>(
    method: string,
    payload?: TPayload,
  ): Promise<TResult>;
  on<TPayload = unknown, TResult = unknown>(
    method: string,
    handler: ChannelHandler<TPayload, TResult>,
  ): () => void;
}
