import { api } from "./axios";

export class API {
  static async getDatasets() {
    const { data } = await api.get<Dataset[]>("/datasets/");
    return data;
  }

  static async getDataset(id: string) {
    const { data } = await api.get<Dataset>(`/datasets/${id}`);
    return data;
  }

  static async deleteDataset(id: string) {
    const { data } = await api.delete<{ message: string }>(`/datasets/${id}/`);
    return data;
  }

  static async updateDataset(id: string, dataset: any) {
    const { data } = await api.patch<Dataset>(`/datasets/${id}/`, dataset);
    return data;
  }

  static async getAggregateFunctions() {
    const { data } = await api.get<string[]>("/utils/aggregate-functions/");
    return data;
  }

  static async getProvinces(): Promise<Province[]> {
    const { data } = await api.get<Province[]>("/administrative-regions/provinces/");
    return data;
  }

  static async getMunicipalities(): Promise<Municipality[]> {
    const { data } = await api.get<Municipality[]>("/administrative-regions/municipalities/");
    return data;
  }

  static async getVisualisationValues(id: string, aggregateFunction: string, level: string, field: string) {
    const { data } = await api.get<Visualisation>(`/datasets/${id}/visualize?aggregate_function=${aggregateFunction}&visualisation_level=${level}&field_name=${field}`);
    return data;
  }

  static async validateFiles(originalFile: File, syntheticFile: File) {
    const formData = new FormData();
    formData.append("original_file", originalFile);
    formData.append("synthetic_file", syntheticFile);

    const { data } = await api.post<{
      columns: string[];
      synthetic_columns: string[];
    }>("/datasets/validate-files/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return data;
  }

  static async createDataset(name: string, postcodeField: string, originalFile: File, syntheticFile: File) {
    const formData = new FormData();
    formData.append("original_file", originalFile);
    formData.append("synthetic_file", syntheticFile);
    formData.append("name", name);
    formData.append("postcode_field", postcodeField)

    const { data } = await api.post<Dataset>("/datasets/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return data;
  }
}
