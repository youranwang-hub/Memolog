"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import type { ProfileInput } from "@/lib/types";
import { createEmptyProfile, fetchProfile, saveProfile } from "@/lib/profile";

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      if (!user) return;
      setLoading(true);
      try {
        const data = await fetchProfile(user.id);
        if (!active) return;
        setProfile(data ?? createEmptyProfile(user.id, user.email));
      } catch {
        if (active) {
          setProfile(createEmptyProfile(user.id, user.email));
          toast.error("档案读取失败，请稍后重试");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, [user]);

  function updateField(field: keyof ProfileInput, value: string) {
    if (!profile) return;
    setProfile({ ...profile, [field]: value });
  }

  function addCategory() {
    if (!profile) return;
    const value = newCategory.trim();
    if (!value) return;
    if (profile.custom_categories.includes(value)) {
      toast.error("这个自定义分类已经存在了");
      return;
    }
    setProfile({ ...profile, custom_categories: [...profile.custom_categories, value] });
    setNewCategory("");
  }

  function removeCategory(category: string) {
    if (!profile) return;
    setProfile({
      ...profile,
      custom_categories: profile.custom_categories.filter((item) => item !== category),
    });
  }

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    try {
      const saved = await saveProfile(profile);
      setProfile(saved);
      toast.success("档案已保存");
    } catch {
      toast.error("保存失败，请稍后重试");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !profile) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin h-6 w-6 border-2 border-stone-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-lg font-semibold">我的档案</h1>
        <p className="text-sm text-muted-foreground mt-1">
          这些信息会在生成简历、自我介绍和自定义内容时作为背景使用。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">基础称呼</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-sm">希望 Memolog 怎么称呼你</Label>
            <Input
              value={profile.display_name}
              onChange={(event) => updateField("display_name", event.target.value)}
              placeholder="写下你希望的称呼"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">简历中使用的姓名</Label>
            <Input
              value={profile.real_name}
              onChange={(event) => updateField("real_name", event.target.value)}
              placeholder="可留空，需要时再填"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">自定义分类</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            这里的分类会用于记录、编辑和筛选。可以自由添加或删除；删除不会影响已有记忆的内容。
          </p>
          <div className="flex gap-2">
            <Input
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addCategory();
                }
              }}
              placeholder="例如：社团、志愿服务、阅读"
              maxLength={20}
            />
            <Button type="button" variant="outline" onClick={addCategory}>
              <Plus className="h-4 w-4 mr-1" />
              添加
            </Button>
          </div>
          {profile.custom_categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {profile.custom_categories.map((category) => (
                <Badge key={category} variant="secondary" className="gap-1 py-1 pl-2">
                  {category}
                  <button
                    type="button"
                    onClick={() => removeCategory(category)}
                    className="rounded-sm hover:text-destructive"
                    aria-label={`删除分类 ${category}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">当前身份</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-sm">身份阶段</Label>
            <Input
              value={profile.identity_stage}
              onChange={(event) => updateField("identity_stage", event.target.value)}
              placeholder="如：本科生 / 研究生 / 求职中"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">年级</Label>
            <Input
              value={profile.grade}
              onChange={(event) => updateField("grade", event.target.value)}
              placeholder="如：大三 / 研一"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">学校</Label>
            <Input
              value={profile.school}
              onChange={(event) => updateField("school", event.target.value)}
              placeholder="如：某某大学"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">专业</Label>
            <Input
              value={profile.major}
              onChange={(event) => updateField("major", event.target.value)}
              placeholder="如：数据科学与大数据技术"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">生成偏好</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm">目标方向</Label>
              <Input
                value={profile.target_direction}
                onChange={(event) => updateField("target_direction", event.target.value)}
                placeholder="如：数据分析 / 产品经理 / 算法"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">常用邮箱</Label>
              <Input
                value={profile.contact_email}
                onChange={(event) => updateField("contact_email", event.target.value)}
                placeholder="用于简历，可留空"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">联系电话</Label>
              <Input
                value={profile.contact_phone}
                onChange={(event) => updateField("contact_phone", event.target.value)}
                placeholder="用于简历，可留空"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">生成语气</Label>
              <Input
                value={profile.preferred_tone}
                onChange={(event) => updateField("preferred_tone", event.target.value)}
                placeholder="如：自然、有条理、不要太夸张"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">补充信息</Label>
            <Textarea
              value={profile.extra_info}
              onChange={(event) => updateField("extra_info", event.target.value)}
              placeholder="任何你希望 Memolog 记住的背景：性别、年龄、城市、长期目标、个人偏好等，都可以自愿写在这里。"
              rows={4}
              className="resize-none"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "保存中..." : "保存档案"}
        </Button>
      </div>
    </div>
  );
}
