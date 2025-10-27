"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { EnumGender } from "@prisma/client";

interface ClientFormModalProps {
  conversationId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  isCompleted?: boolean;
}

export function ClientFormModal({
  conversationId,
  isOpen,
  onClose,
  onSuccess,
  isCompleted = false,
}: ClientFormModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    gender: EnumGender.male,
    age: 0,
    city: "",
    phone: "",
    loanAmount: 0,
    loanPurpose: "",
    jobPosition: "",
    jobDuration: "",
    monthlyIncome: 0,
    payday: "",
    housingDuration: "",
    rent: 0,
    livingWith: "",
    maritalStatus: "",
    hasChildren: "",
    creditStatus: "",
    sesameCredit: "",
    emptyLoan: "",
    phoneModel: "",
    hasProperty: "",
    end_of_id: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // 加载表单数据
  const loadFormData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/client-forms/${conversationId}`);
      const data = await response.json();

      if (data.success && data.form) {
        // 填充表单数据
        const loadedForm = data.form;
        setFormData({
          name: loadedForm.name || "",
          gender: loadedForm.gender || "",
          age: loadedForm.age || 0,
          city: loadedForm.city || "",
          phone: loadedForm.phone || "",
          loanAmount: loadedForm.loanAmount || 0,
          loanPurpose: loadedForm.loanPurpose || "",
          jobPosition: loadedForm.jobPosition || "",
          jobDuration: loadedForm.jobDuration || "",
          monthlyIncome: loadedForm.monthlyIncome || 0,
          payday: loadedForm.payday || "",
          housingDuration: loadedForm.housingDuration || "",
          rent: loadedForm.rent || 0,
          livingWith: loadedForm.livingWith || "",
          maritalStatus: loadedForm.maritalStatus || "",
          hasChildren: loadedForm.hasChildren || "",
          creditStatus: loadedForm.creditStatus || "",
          sesameCredit: loadedForm.sesameCredit || "",
          emptyLoan: loadedForm.emptyLoan || "",
          phoneModel: loadedForm.phoneModel || "",
          hasProperty: loadedForm.hasProperty || "",
          end_of_id: loadedForm.end_of_id || "",
        });
      }
    } catch (error) {
      console.error("加载表单数据失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && conversationId) {
      loadFormData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, conversationId]);

  // 验证手机号码格式
  const validatePhone = (phone: string) => {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  };

  // 验证表单数据
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // 必填字段验证
    if (!formData.name.trim()) {
      newErrors.name = "请输入姓名";
    }

    if (!formData.city.trim()) {
      newErrors.city = "请输入城市区镇";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "请输入手机号码";
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = "请输入正确的手机号码";
    }

    if (!formData.loanAmount) {
      newErrors.loanAmount = "请输入借款金额";
    }

    // 金额格式验证（数字）
    if (formData.loanAmount && isNaN(Number(formData.loanAmount))) {
      newErrors.loanAmount = "借款金额必须是数字";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 验证表单
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/client-forms/${conversationId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess?.();
        onClose();
      } else {
        alert("提交失败，请重试");
      }
    } catch (error) {
      console.error("提交表单失败:", error);
      alert("提交失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">
            {isCompleted ? "修改申请表" : "填写申请表"}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {isCompleted
              ? "请修改您的申请表信息"
              : "请详细填写以下信息，以便我们更好地为您服务"}
          </p>
        </div>

        {isLoading ? (
          <div className="p-6 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">加载中...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="flex gap-4 items-center">
              <div className="flex flex-col gap-2">
                <Label>
                  姓名<span className="text-destructive">*</span>
                </Label>
                <Input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => {
                    updateField("name", e.target.value);
                    if (errors.name) {
                      setErrors((prev) => ({ ...prev, name: "" }));
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.name ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.name && (
                  <p className="text-xs text-red-500 mt-1">{errors.name}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">性别年龄</Label>
                <div className="flex border border-gray-300 rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white">
                  {/* 性别下拉 */}
                  <div className="relative flex items-center border-r border-gray-200">
                    <Select
                      className="appearance-none bg-transparent border-0 py-1 pl-3 pr-8 focus:ring-0 focus:outline-none text-gray-900 min-w-[80px]"
                      value={formData.gender.toString()}
                      onChange={(e) => updateField("gender", e.target.value)}
                    >
                      <option value={EnumGender.male}>男</option>
                      <option value={EnumGender.female}>女</option>
                    </Select>
                    <div className="absolute right-2 pointer-events-none">
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* 年龄输入 */}
                  <Input
                    required
                    type="number"
                    className="flex-1 border-0 focus:ring-0 focus:outline-none py-2.5 px-3 placeholder-gray-400"
                    placeholder="年龄"
                    value={formData.age <= 0 ? "" : formData.age}
                    onChange={(e) =>
                      updateField("age", parseInt(e.target.value))
                    }
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex flex-col gap-2">
                <Label>
                  手机号码<span className="text-destructive">*</span>
                </Label>
                <Input
                  required
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    updateField("phone", e.target.value);
                    if (errors.phone) {
                      setErrors((prev) => ({ ...prev, phone: "" }));
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.phone ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.phone && (
                  <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label>城市区镇</Label>
                <Input
                  required
                  type="text"
                  value={formData.city}
                  onChange={(e) => {
                    updateField("city", e.target.value);
                    if (errors.city) {
                      setErrors((prev) => ({ ...prev, city: "" }));
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.city ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.city && (
                  <p className="text-xs text-red-500 mt-1">{errors.city}</p>
                )}
              </div>
            </div>
            {/* 借款信息 */}
            <div className="flex gap-4">
              <div className="flex flex-col gap-2">
                <Label>要借多少</Label>
                <Input
                  required
                  type="number"
                  value={formData.loanAmount || ""}
                  onChange={(e) => {
                    updateField("loanAmount", parseInt(e.target.value));
                    if (errors.loanAmount) {
                      setErrors((prev) => ({ ...prev, loanAmount: "" }));
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.loanAmount ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.loanAmount && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.loanAmount}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label>月入多少</Label>
                <Input
                  required
                  type="number"
                  value={formData.monthlyIncome || ""}
                  onChange={(e) =>
                    updateField("monthlyIncome", parseInt(e.target.value))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>发工资日</Label>
                <Input
                  type="text"
                  value={formData.payday || ""}
                  onChange={(e) =>
                    updateField("payday", e.target.value.toString())
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex flex-col gap-2">
                <Label>借款用途</Label>
                <Input
                  required
                  type="text"
                  value={formData.loanPurpose || ""}
                  onChange={(e) => updateField("loanPurpose", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex flex-col gap-2">
                <Label>工作岗位</Label>
                <Input
                  required
                  type="text"
                  value={formData.jobPosition}
                  onChange={(e) => updateField("jobPosition", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>做了多久</Label>
                <Input
                  required
                  type="text"
                  value={formData.jobDuration}
                  onChange={(e) => updateField("jobDuration", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            {/* 居住信息 */}
            <div className="flex gap-4">
              <div className="flex flex-col gap-2">
                <Label>住房多久</Label>
                <Input
                  required
                  type="text"
                  value={formData.housingDuration}
                  onChange={(e) =>
                    updateField("housingDuration", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>租金多少</Label>
                <Input
                  required
                  type="number"
                  value={formData.rent || ""}
                  onChange={(e) =>
                    updateField("rent", parseInt(e.target.value))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>跟谁同住</Label>
                <Input
                  required
                  type="text"
                  value={formData.livingWith}
                  onChange={(e) => updateField("livingWith", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex flex-col gap-2">
                <Label>婚姻状况</Label>
                <Input
                  required
                  type="text"
                  value={formData.maritalStatus}
                  onChange={(e) => updateField("maritalStatus", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>有无子女</Label>
                <Input
                  required
                  type="text"
                  value={formData.hasChildren}
                  onChange={(e) => updateField("hasChildren", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            {/* 征信信息 */}
            <div className="flex gap-4">
              <div className="flex flex-col gap-2">
                <Label>征信情况</Label>
                <Input
                  required
                  type="text"
                  value={formData.creditStatus}
                  onChange={(e) => updateField("creditStatus", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>芝麻信用</Label>
                <Input
                  required
                  value={formData.sesameCredit}
                  onChange={(e) => updateField("sesameCredit", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>借空放没</Label>
                <Input
                  required
                  value={formData.emptyLoan}
                  onChange={(e) => updateField("emptyLoan", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex flex-col gap-2">
                <Label>手机型号</Label>
                <Input
                  required
                  value={formData.phoneModel}
                  onChange={(e) => updateField("phoneModel", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>有无房车</Label>
                <Input
                  required
                  type="text"
                  value={formData.hasProperty}
                  onChange={(e) => updateField("hasProperty", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            {/* 描述情况 */}
            <div className="flex flex-col gap-2">
              <Label>身份证后六位</Label>
              <Input
                required
                value={formData.end_of_id}
                onChange={(e) => updateField("end_of_id", e.target.value)}
              />
            </div>

            {/* 按钮 */}
            <div className="flex items-center justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting
                  ? "提交中..."
                  : isCompleted
                  ? "修改申请"
                  : "提交申请"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
