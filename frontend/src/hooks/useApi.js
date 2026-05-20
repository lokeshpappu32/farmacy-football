import { useCallback, useEffect, useState } from "react";

export function useApi(fn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const run = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fn();
      setData(result);
      return result;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  return { data, loading, error, refresh: run };
}
