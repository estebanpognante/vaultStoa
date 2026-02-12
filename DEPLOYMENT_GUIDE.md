# Guía de Despliegue para Vercel y Firebase

Esta guía detalla los pasos necesarios para desplegar tu aplicación `vault-crm` en Vercel y asegurar que Firebase funcione correctamente en producción.

## 1. Configuración en Vercel

Antes o durante el despliegue en Vercel, debes configurar las variables de entorno para que tu aplicación pueda conectarse a Firebase.

1.  Ve al dashboard de tu proyecto en Vercel.
2.  Navega a **Settings** > **Environment Variables**.
3.  Agrega las siguientes variables copiando los valores de tu archivo local `.env`:

| Variable | Descripción |
| :--- | :--- |
| `VITE_FIREBASE_API_KEY` | Tu API Key de Firebase |
| `VITE_FIREBASE_AUTH_DOMAIN` | Tu Auth Domain de Firebase |
| `VITE_FIREBASE_PROJECT_ID` | Tu Project ID de Firebase |
| `VITE_FIREBASE_STORAGE_BUCKET` | Tu Storage Bucket de Firebase |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Tu Messaging Sender ID de Firebase |
| `VITE_FIREBASE_APP_ID` | Tu App ID de Firebase |

> **Nota:** Asegúrate de copiar los valores *sin* comillas.

## 2. Actualización de Reglas de Firebase (Firestore)

Hemos actualizado el archivo `firestore.rules` para permitir el acceso solo a los usuarios autorizados (tu email y admin). Para aplicar estos cambios en la nube:

### Opción A: Usando Firebase CLI (Recomendado si está instalado)

Si tienes Firebase CLI instalado y logueado:

```bash
firebase deploy --only firestore:rules
```

Si también has hecho cambios en los índices (indexes):

```bash
firebase deploy --only firestore:indexes
```

### Opción B: Copiar y Pegar en la Consola de Firebase

1.  Ve a la [Consola de Firebase](https://console.firebase.google.com/).
2.  Selecciona tu proyecto.
3.  Navega a **Firestore Database** > **Reglas**.
4.  Copia el contenido de tu archivo local `firestore.rules`:
    ```javascript
    service cloud.firestore {
      match /databases/{database}/documents {
        match /{document=**} {
          allow read, write: if request.auth != null &&
            (request.auth.token.email == 'estebanpognante@gmail.com' ||
             request.auth.token.email == 'admin@example.com');
        }
      }
    }
    ```
5.  Pega el contenido en el editor de la consola y pulsa **Publicar**.

## 3. Verificación

Una vez desplegado en Vercel y actualizadas las reglas:

1.  Abre la URL de tu aplicación en Vercel.
2.  Intenta iniciar sesión con `estebanpognante@gmail.com`.
3.  Verifica que puedes ver los datos y navegar correctamente.
4.  (Opcional) Intenta iniciar sesión con un correo NO autorizado para verificar que el acceso es denegado o restringido.

## 4. Troubleshooting

-   **Error de permisos (Missing or insufficient permissions):** Revisa que las reglas de Firestore en la consola coincidan con las de arriba y que el email con el que te logueaste esté en la lista.
-   **Error de conexión:** Verifica que las variables de entorno en Vercel estén escritas correctamente y coincidan con tu configuración de Firebase.
