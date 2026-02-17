// ml.service.js
import axios from "axios";
import FormData from "form-data";

export const sendToML = async (fileBuffer, fileName) => {
  const formData = new FormData();
  formData.append("image", fileBuffer, fileName);

  const response = await axios.post(
    process.env.ML_API_URL,
    formData,
    { headers: formData.getHeaders() }
  );

  return response.data;
};
