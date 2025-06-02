var raytraceFS = /* glsl */ `
	struct Ray {
		vec3 pos;
		vec3 dir;
	};

	struct Material {
		vec3  k_d;	// diffuse coefficient
		vec3  k_s;	// specular coefficient
		float n;	// specular exponent
	};

	struct Sphere {
		vec3     center;
		float    radius;
		Material mtl;
	};

	struct Light {
		vec3 position;
		vec3 intensity;
	};

	struct HitInfo {
		float    t;
		vec3     position;
		vec3     normal;
		Material mtl;
	};

	uniform Sphere spheres[NUM_SPHERES];
	uniform Light  lights [NUM_LIGHTS];
	uniform samplerCube envMap;
	uniform int bounceLimit;

	bool IntersectRay(inout HitInfo hit, Ray ray);

	// Shades the given point and returns the computed color.
	vec3 Shade(Material mtl, vec3 position, vec3 normal, vec3 view) {
		vec3 color = vec3(0, 0, 0);
		for (int i = 0; i < NUM_LIGHTS; ++i) {
			vec3 lightDir = normalize(lights[i].position - position);

			// Shadow ray
			Ray shadowRay;
			shadowRay.pos = position + normal * 0.001;	// offset to avoid self-intersection
			shadowRay.dir = lightDir;

			HitInfo shadowHit;
			if (IntersectRay(shadowHit, shadowRay)) {
				float distToLight = length(lights[i].position - position);
				if (shadowHit.t < distToLight) continue;	// in shadow
			}

			// Diffuse
			float diff = max(dot(normal, lightDir), 0.0);
			vec3 diffuse = mtl.k_d * diff * lights[i].intensity;

			// Specular (Blinn-Phong)
			vec3 halfVec = normalize(lightDir + view);
			float spec = pow(max(dot(normal, halfVec), 0.0), mtl.n);
			vec3 specular = mtl.k_s * spec * lights[i].intensity;

			color += diffuse + specular;
		}
		return color;
	}

	// Intersects the given ray with all spheres in the scene
	// and updates the given HitInfo using the information of the sphere
	// that first intersects with the ray.
	// Returns true if an intersection is found.
	bool IntersectRay(inout HitInfo hit, Ray ray) {
		hit.t = 1e30;
		bool foundHit = false;
		for (int i = 0; i < NUM_SPHERES; ++i) {
			vec3 oc = ray.pos - spheres[i].center;
			float a = dot(ray.dir, ray.dir);
			float b = 2.0 * dot(oc, ray.dir);
			float c = dot(oc, oc) - spheres[i].radius * spheres[i].radius;
			float delta = (b * b) - (4.0 * a * c);
			if (delta > 0.0) {
				float sqrtDelta = sqrt(delta);
				float t0 = (-b - sqrtDelta) / (2.0 * a);
				float t1 = (-b + sqrtDelta) / (2.0 * a);
				float t = (t0 > 0.001) ? t0 : ((t1 > 0.001) ? t1 : 1e30);
				if (t < hit.t) {
					hit.t = t;
					hit.position = ray.pos + ray.dir * t;
					hit.normal = normalize(hit.position - spheres[i].center);
					hit.mtl = spheres[i].mtl;
					foundHit = true;
				}
			}
		}
		return foundHit;
	}

	// Given a ray, returns the shaded color where the ray intersects a sphere.
	// If the ray does not hit a sphere, returns the environment color.
	vec4 RayTracer(Ray ray) {
		HitInfo hit;
		if (IntersectRay(hit, ray)) {
			vec3 view = normalize(-ray.dir);
			vec3 clr = Shade(hit.mtl, hit.position, hit.normal, view);
			
			// Compute reflections
			vec3 k_s = hit.mtl.k_s;
			Ray r = ray;	// this is the reflection ray
			HitInfo h = hit;	// reflection hit info
			for (int bounce = 0; bounce < MAX_BOUNCES; ++bounce) {
				if (bounce >= bounceLimit) break;
				if (h.mtl.k_s.r + h.mtl.k_s.g + h.mtl.k_s.b <= 0.0) break;
				
				// Initialize the reflection ray
				r.pos = h.position + h.normal * 0.001;	// offset to avoid glitch
				r.dir = reflect(r.dir, h.normal);
				r.dir = normalize(r.dir);
				
				if (IntersectRay(h, r)) {
					vec3 viewRef = normalize(-r.dir);
					vec3 refColor = Shade(h.mtl, h.position, h.normal, viewRef);
					clr += k_s * refColor;
					k_s *= h.mtl.k_s;	// attenuate reflection by material specular
				}
				else {
					// The refleciton ray did not intersect with anything,
					// so we are using the environment color
					clr += k_s * textureCube(envMap, r.dir.xzy).rgb;
					break;	// no more reflections
				}
			}
			return vec4(clr, 1);	// return the accumulated color, including the reflections
		}
		else {
			return vec4(textureCube(envMap, ray.dir.xzy).rgb, 0);	// return the environment color
		}
	}
`;
