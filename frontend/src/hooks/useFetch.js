import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export function useFetch(url, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);

  const { immediate = true, params = {} } = options;

  const fetchData = useCallback(async (extraParams = {}) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get(url, {
        params: { ...params, ...extraParams }
      });

      setData(response.data.data);
      if (response.data.pagination) {
        setPagination(response.data.pagination);
      }

      return response.data;
    } catch (err) {
      const message = err.response?.data?.message || 'Error al cargar datos';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    if (immediate) {
      fetchData();
    }
  }, [immediate, fetchData]);

  return { data, loading, error, pagination, refetch: fetchData };
}
