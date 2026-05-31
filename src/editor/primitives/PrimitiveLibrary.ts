import * as THREE from 'three';
import { History, Action } from '../History';

export class PrimitiveLibrary {
  private scene: THREE.Scene;
  private history: History;

  constructor(scene: THREE.Scene, history: History) {
    this.scene = scene;
    this.history = history;
  }

  public addTree(): void {
    const meshes: THREE.Mesh[] = [];

    // Trunk - brown cylinder
    const trunkGeo = new THREE.CylinderGeometry(0.1, 0.15, 1, 6, 1);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, flatShading: true });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.5;
    trunk.name = 'Ствол';
    meshes.push(trunk);

    // Crown - green cone
    const crownGeo = new THREE.ConeGeometry(0.5, 1.2, 6, 1);
    const crownMat = new THREE.MeshStandardMaterial({ color: 0x228B22, flatShading: true });
    const crown = new THREE.Mesh(crownGeo, crownMat);
    crown.position.y = 1.6;
    crown.name = 'Крона';
    meshes.push(crown);

    this.addToScene(meshes, 'Дерево');
  }

  public addRock(): void {
    const meshes: THREE.Mesh[] = [];

    // Deformed icosahedron
    const geo = new THREE.IcosahedronGeometry(0.5, 0);
    const positions = geo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i) + (Math.random() - 0.5) * 0.15;
      const y = positions.getY(i) + (Math.random() - 0.5) * 0.15;
      const z = positions.getZ(i) + (Math.random() - 0.5) * 0.15;
      positions.setXYZ(i, x, y, z);
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({ color: 0x808080, flatShading: true });
    const rock = new THREE.Mesh(geo, mat);
    rock.position.y = 0.3;
    rock.name = 'Камень';
    meshes.push(rock);

    this.addToScene(meshes, 'Камень');
  }

  public addHouse(): void {
    const meshes: THREE.Mesh[] = [];

    // Body - beige box
    const bodyGeo = new THREE.BoxGeometry(1.2, 1, 1);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xD2B48C, flatShading: true });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.5;
    body.name = 'Стены';
    meshes.push(body);

    // Roof - brown/red pyramid (cone with 4 sides)
    const roofGeo = new THREE.ConeGeometry(0.9, 0.6, 4, 1);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x8B0000, flatShading: true });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 1.3;
    roof.rotation.y = Math.PI / 4;
    roof.name = 'Крыша';
    meshes.push(roof);

    this.addToScene(meshes, 'Дом');
  }

  public addCharacter(): void {
    const meshes: THREE.Mesh[] = [];
    const skinColor = 0xFFDBB0;
    const shirtColor = 0x4169E1;

    // Torso
    const torsoGeo = new THREE.BoxGeometry(0.4, 0.6, 0.25);
    const torsoMat = new THREE.MeshStandardMaterial({ color: shirtColor, flatShading: true });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 1.0;
    torso.name = 'Торс';
    meshes.push(torso);

    // Head
    const headGeo = new THREE.BoxGeometry(0.25, 0.25, 0.25);
    const headMat = new THREE.MeshStandardMaterial({ color: skinColor, flatShading: true });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.45;
    head.name = 'Голова';
    meshes.push(head);

    // Left arm
    const armGeo = new THREE.BoxGeometry(0.15, 0.5, 0.15);
    const armMat = new THREE.MeshStandardMaterial({ color: skinColor, flatShading: true });
    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.35, 1.0, 0);
    leftArm.name = 'Левая рука';
    meshes.push(leftArm);

    // Right arm
    const rightArm = new THREE.Mesh(armGeo.clone(), armMat.clone());
    rightArm.position.set(0.35, 1.0, 0);
    rightArm.name = 'Правая рука';
    meshes.push(rightArm);

    // Left leg
    const legGeo = new THREE.BoxGeometry(0.15, 0.6, 0.15);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x2F4F4F, flatShading: true });
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.12, 0.4, 0);
    leftLeg.name = 'Левая нога';
    meshes.push(leftLeg);

    // Right leg
    const rightLeg = new THREE.Mesh(legGeo.clone(), legMat.clone());
    rightLeg.position.set(0.12, 0.4, 0);
    rightLeg.name = 'Правая нога';
    meshes.push(rightLeg);

    this.addToScene(meshes, 'Персонаж');
  }

  public addSword(): void {
    const meshes: THREE.Mesh[] = [];

    // Blade - thin long box, silver/gray
    const bladeGeo = new THREE.BoxGeometry(0.08, 1.2, 0.02);
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xC0C0C0, flatShading: true });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.y = 1.1;
    blade.name = 'Клинок';
    meshes.push(blade);

    // Crossguard - small box
    const guardGeo = new THREE.BoxGeometry(0.3, 0.06, 0.06);
    const guardMat = new THREE.MeshStandardMaterial({ color: 0xDAA520, flatShading: true });
    const guard = new THREE.Mesh(guardGeo, guardMat);
    guard.position.y = 0.5;
    guard.name = 'Гарда';
    meshes.push(guard);

    // Handle - brown cylinder
    const handleGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.3, 6, 1);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, flatShading: true });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.y = 0.3;
    handle.name = 'Рукоять';
    meshes.push(handle);

    this.addToScene(meshes, 'Меч');
  }

  public addShield(): void {
    const meshes: THREE.Mesh[] = [];

    // Flattened cylinder - gray/blue
    const shieldGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.05, 8, 1);
    const shieldMat = new THREE.MeshStandardMaterial({ color: 0x4682B4, flatShading: true });
    const shield = new THREE.Mesh(shieldGeo, shieldMat);
    shield.position.y = 0.7;
    shield.rotation.x = Math.PI / 2;
    shield.name = 'Щит';
    meshes.push(shield);

    this.addToScene(meshes, 'Щит');
  }

  private addToScene(meshes: THREE.Mesh[], groupName: string): void {
    const scene = this.scene;

    const action: Action = {
      description: `Добавить ${groupName}`,
      execute: () => {
        for (const mesh of meshes) {
          scene.add(mesh);
        }
      },
      undo: () => {
        for (const mesh of meshes) {
          scene.remove(mesh);
        }
      },
    };

    this.history.push(action);
  }
}
