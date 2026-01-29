TouchDesigner용 기초 3D 프로덕트(Starter Pack)

포함(OBJ, ASCII)
- cube.obj (1×1×1, 중심 원점)
- plane.obj (2×2, Y=0 평면, 중심 원점)
- sphere.obj (반지름 0.5)
- cylinder.obj (반지름 0.35, 높이 1.0)
- cone.obj (반지름 0.4, 높이 1.0)
- torus.obj (R=0.35, r=0.15)
- capsule.obj (반지름 0.25, 높이 1.2)
- arrow.obj (길이 1.2, +Y 방향)
- axes_gizmo.obj (X/Y/Z 축 화살표)

권장 사용 방식(TouchDesigner)
1) 네트워크에 OBJ 파일을 드래그&드롭 → File In SOP로 로드
2) Geometry COMP 내부에 File In SOP를 두고, Null SOP로 정리한 뒤 Render/Display 플래그를 Null에 설정
3) 이후 SOP 레벨에서 변형/복제(Instancing)나 머티리얼(Material SOP/Phong MAT 등)을 연결

좌표계 참고(모델 기준)
- 이 팩은 기본적으로 'Y 축이 위(+Y up)'로 가정하고 생성했습니다.
- 필요 시 Geometry COMP Transform에서 축 스케일/회전으로 맞추면 됩니다.

생성: ChatGPT
