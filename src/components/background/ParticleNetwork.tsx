import { useRef, useEffect } from 'react';
import * as THREE from 'three';

export function ParticleNetwork() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Particles
    const particleCount = 80;
    const particles: THREE.Mesh[] = [];
    const particleGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const particleMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x008080,
      transparent: true,
      opacity: 0.6
    });

    for (let i = 0; i < particleCount; i++) {
      const particle = new THREE.Mesh(particleGeometry, particleMaterial.clone());
      particle.position.set(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 10
      );
      particle.userData = {
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.01,
          (Math.random() - 0.5) * 0.01,
          (Math.random() - 0.5) * 0.005
        ),
        originalPos: particle.position.clone()
      };
      scene.add(particle);
      particles.push(particle);
    }

    // Lines
    const lineMaterial = new THREE.LineBasicMaterial({ 
      color: 0x008080,
      transparent: true,
      opacity: 0.15
    });
    const lines: THREE.Line[] = [];

    function updateLines() {
      // Remove old lines
      lines.forEach(line => scene.remove(line));
      lines.length = 0;

      // Create new lines between close particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const distance = particles[i].position.distanceTo(particles[j].position);
          if (distance < 3) {
            const geometry = new THREE.BufferGeometry().setFromPoints([
              particles[i].position,
              particles[j].position
            ]);
            const line = new THREE.Line(geometry, lineMaterial);
            scene.add(line);
            lines.push(line);
          }
        }
      }
    }

    camera.position.z = 10;

    // Mouse move handler
    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current = {
        x: ((event.clientX - rect.left) / width) * 2 - 1,
        y: -((event.clientY - rect.top) / height) * 2 + 1
      };
    };

    container.addEventListener('mousemove', handleMouseMove);

    // Animation
    let animationId: number;
    const clock = new THREE.Clock();

    function animate() {
      animationId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Update particles
      particles.forEach((particle, i) => {
        const velocity = particle.userData.velocity;
        particle.position.add(velocity);

        // Mouse repulsion
        const mouseX = mouseRef.current.x * 10;
        const mouseY = mouseRef.current.y * 7.5;
        const dx = particle.position.x - mouseX;
        const dy = particle.position.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 2) {
          particle.position.x += dx * 0.01;
          particle.position.y += dy * 0.01;
        }

        // Gentle floating
        particle.position.y += Math.sin(elapsedTime * 0.5 + i) * 0.002;

        // Boundary check
        if (Math.abs(particle.position.x) > 10) velocity.x *= -1;
        if (Math.abs(particle.position.y) > 7.5) velocity.y *= -1;
        if (Math.abs(particle.position.z) > 5) velocity.z *= -1;

        // Pulse opacity
        const material = particle.material as THREE.MeshBasicMaterial;
        material.opacity = 0.4 + Math.sin(elapsedTime * 2 + i) * 0.2;
      });

      // Update lines periodically (every 10 frames for performance)
      if (Math.floor(elapsedTime * 60) % 10 === 0) {
        updateLines();
      }

      renderer.render(scene, camera);
    }

    animate();

    // Resize handler
    const handleResize = () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      container.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
    />
  );
}
