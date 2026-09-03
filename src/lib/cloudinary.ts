import { v2 as cloudinary } from "cloudinary";

// Configuración de Cloudinary para almacenamiento de imágenes
// Se configura una sola vez y se reutiliza en toda la app
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

// Helper para subir imagen a Cloudinary
export async function subirImagen(
  file: File,
  carpeta: string = "fixhub"
): Promise<{ url: string; publicId: string }> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: carpeta,
        resource_type: "auto",
        quality: "auto",
        fetch_format: "auto",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result!.secure_url,
          publicId: result!.public_id,
        });
      }
    );

    uploadStream.end(buffer);
  });
}

// Helper para eliminar imagen de Cloudinary
export async function eliminarImagen(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}
