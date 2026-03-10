"use client";

import { Package, Plus, Trash2 } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { SectionLabel } from "../ui/section-label";
import { Input } from "../ui/input";

interface Asset {
  id: string;
  assetCode: string;
  assetName: string;
  status: string;
  detail: string;
}

interface AssetsSectionProps {
  assets: Asset[];
  onAddAsset: () => void;
  onRemoveAsset: (id: string) => void;
  onUpdateAsset: (id: string, field: keyof Asset, value: string) => void;
}

export function AssetsSection({
  assets,
  onAddAsset,
  onRemoveAsset,
  onUpdateAsset,
}: AssetsSectionProps) {
  return (
    <Card>
      <SectionLabel icon={Package} number={9}>
        ทรัพย์สิน
      </SectionLabel>

      <div className="mt-3 space-y-3">
        {assets.map((asset, index) => (
          <div
            key={asset.id}
            className="p-3 bg-muted/50 rounded-xl border border-border"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-foreground">
                รายการที่ {index + 1}
              </span>
              <button
                type="button"
                onClick={() => onRemoveAsset(asset.id)}
                className="text-destructive hover:bg-destructive/10 p-1 rounded-lg transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={asset.assetCode}
                onChange={(e) =>
                  onUpdateAsset(asset.id, "assetCode", e.target.value)
                }
                placeholder="รหัสทรัพย์สิน"
              />
              <Input
                value={asset.assetName}
                onChange={(e) =>
                  onUpdateAsset(asset.id, "assetName", e.target.value)
                }
                placeholder="ชื่อทรัพย์สิน"
              />
              <Input
                value={asset.status}
                onChange={(e) =>
                  onUpdateAsset(asset.id, "status", e.target.value)
                }
                placeholder="สถานะ"
              />
              <Input
                value={asset.detail}
                onChange={(e) =>
                  onUpdateAsset(asset.id, "detail", e.target.value)
                }
                placeholder="รายละเอียด"
              />
            </div>
          </div>
        ))}
      </div>

      <Button variant="add" className="w-full mt-3" onClick={onAddAsset}>
        <Plus className="h-4 w-4 mr-1" />
        เพิ่มรายการทรัพย์สิน
      </Button>
    </Card>
  );
}
